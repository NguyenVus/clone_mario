# Phân tích lỗi nhảy thấp & thiếu ổn định trên điện thoại (`jump-debug.md`)

Báo cáo kiểm tra 6 nguyên nhân tiềm ẩn trên mã nguồn gốc của **Pixel Hero** (`client/src/entities/Player.ts`, `client/src/systems/InputManager.ts`, `client/src/ui/TouchControls.ts`, `client/src/scenes/GameScene.ts`, `client/src/config.ts`):

## Kết quả kiểm tra từng hạng mục

1. **Nút nhảy cảm ứng không giữ trạng thái** — **CÓ LỖI GIÁN TIẾP / ĐỒNG BỘ**
   - `TouchControls` (trong `UIScene`) cập nhật `touchState` trong `UIScene.update()`, chạy *sau* `GameScene.update()` trong cùng tick (trễ 1 frame). Ngoài ra `GameScene.bouncePlayerAfterStomp()` gọi lại `inputManager.poll()` lần thứ hai trong cùng frame khiến trạng thái cạnh nhấn/thả (`jumpPressed`) bị ghi đè mất.
2. **Nút bị nhả nhầm khi ngón tay xê dịch (`pointerout`)** — **CÓ LỖI TIỀM ẨN TRÊN CẢM ỨNG**
   - `TouchControls` dùng hit-test hình chữ nhật cố định theo toạ độ canvas 400×240 mỗi frame thay vì gắn `pointerId` bằng `setPointerCapture`. Ngón tay hơi trượt khỏi khung nút nhỏ (44px logic) hoặc khi viewport scale là mất trạng thái giữ `jump = false` ngay lập tức, kích hoạt cắt nhảy sớm.
3. **Chưa bật đa chạm đầy đủ** — **ĐÃ BẬT NHƯNG CHƯA ĐỦ TIN CẬY**
   - `BootScene` đã gọi `this.input.addPointer(3)`, nhưng nút cảm ứng vẽ trong canvas Phaser không có vùng đệm chạm (+12px) và không hỗ trợ trượt ngón tay giữa Nhảy ↔ Chạy/Bắn trên cùng tay phải.
4. **Logic phụ thuộc tốc độ khung hình (120Hz / 144Hz)** — **LỖI NGHIÊM TRỌNG (THẬT)**
   - Trong `Player.ts` (dòng 309–311 cũ):
     ```ts
     if (!input.jump && body.velocity.y < PHYSICS_CONFIG.JUMP_CUT_VY_THRESHOLD) {
       body.setVelocityY(body.velocity.y * PHYSICS_CONFIG.JUMP_CUT_MULT);
     }
     ```
     Phép nhân `vy *= 0.45` chạy **mỗi frame `update()`** thay vì chỉ một lần khi thả nút, và `GameScene.update()` chạy theo tần số quét màn hình (`requestAnimationFrame`: 120Hz trên iPhone ProMotion / Android 120Hz, 144Hz trên desktop) trong khi không có vòng lặp bước cố định 60Hz đồng bộ với `InputManager`. Do đó ở 120Hz vận tốc nhảy bị cắt gấp đôi tần suất và vật lý trôi lệch so với 60Hz.
5. **Vận tốc bị kẹp (`setMaxVelocityY`)** — **LỖI THẬT**
   - `Player.ts` gọi `body.setMaxVelocityY(PHYSICS_CONFIG.MAX_FALL_SPEED)`. Trong Phaser Arcade Physics, `setMaxVelocityY(v)` kẹp **cả chiều rơi (+vy) lẫn chiều bay lên (-vy)**. Khi lực nhảy chạy vượt ngưỡng `MAX_FALL_SPEED` (480 px/s), vận tốc bay lên bị cắt ngầm.
6. **Thông số khởi điểm yếu** — **LỖI THẬT**
   - Với `GRAVITY = 1400` và `JUMP_VELOCITY = -400` ban đầu, độ cao cực đại chỉ đạt `400² / (2 × 1400) ≈ 57.1 px ≈ 3.57 ô` — thấp hơn mức 4 ô của `validator.ts` và khiến Pip đứng tại chỗ không nhảy qua nổi ống cao 4 ô hay lên bệ gạch hàng 9.

## Hướng khắc phục đã áp dụng

1. Chạy toàn bộ logic gameplay (input, nhân vật, quái, vật lý Arcade qua `world.disableUpdate()` + `world.singleStep()`) trong **bước cố định 60Hz** bằng accumulator, tách riêng phần vẽ theo frame.
2. Nâng cấp `InputManager` tách rõ `jumpHeld`, `jumpPressed`, `jumpReleased` (chỉ đọc 1 lần mỗi bước 60Hz) và chuyển nút cảm ứng sang **HTML Overlay** dùng Pointer Events + `setPointerCapture` theo từng `pointerId`.
3. Chuyển sang **trọng lực bất đối xứng** (`GRAVITY_RISE_HOLD = 1100`, `GRAVITY_RISE_RELEASE = 3200`, `GRAVITY_FALL = 1700`, `APEX_GRAVITY_MULT = 0.6`, `MIN_JUMP_TIME_MS = 50`), tắt `setAllowGravity(true)` mặc định trên Pip và chỉ kẹp chiều rơi xuống `vy <= MAX_FALL_SPEED (480)`.
