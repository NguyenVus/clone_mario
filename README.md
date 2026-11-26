# Pixel Hero

Game platformer 2D phong cách cổ điển (8-bit, pixel art tạo hoàn toàn bằng code, âm thanh Web Audio API tổng hợp gốc 100%) chạy trên trình duyệt kèm bảng xếp hạng Express + SQLite.

Nhân vật chính là **Pip**, chú robot nhỏ đội mũ bảo hiểm màu cam, phiêu lưu qua 3 thế giới (**1-1 Green Hills**, **1-2 Underground** + phòng bí mật, **1-3 Magma Castle**) để đánh bại trùm cuối **Magma King**.

---

## Ảnh chụp màn hình (Mô tả bằng chữ)

```text
+----------------------------------------------------------------------+
| PIP 004250    <> x14     [Pip] x3       WORLD 1-1        TIME 264    |
|----------------------------------------------------------------------|
|        (~~~)                              (~~~)                      |
|                                                                      |
|                     [B][?][M][?][B]                                  |
|                                                                      |
|        /\                         [ ]                                |
|       /  \    [Pip]>      (Blob)  | |                                |
| =====/====\====================== | | ============================== |
| #####      #######################   ############################### |
+----------------------------------------------------------------------+
```

- Độ phân giải logic co giãn theo tỉ lệ màn hình: chiều cao cố định `240 px` (15 tile × `16 px`), chiều rộng tự tính từ `360` đến `560 px` (`400 × 240 px` trên tỉ lệ 5:3, `427 × 240 px` trên 16:9, `519–533 × 240 px` trên điện thoại 19.5:9) giúp đầy khung hình ngang mà không có viền đen.
- Giao diện HUD cố định phía trên tự né vùng khuyết `safe-area-inset-*` (tai thỏ/Dynamic Island): điểm 6 chữ số, số Bolt Gem, số mạng, tên màn, đồng hồ đếm ngược (và thanh máu **Magma King** trong phòng boss 1-3).

---

## Yêu cầu hệ thống & Cài đặt

- **Node.js 20+** (đã kiểm thử trên Node `v24.12.0` và npm `11.6.2`).
- Cài đặt toàn bộ workspace:

```bash
npm install
```

### Các lệnh chính

| Lệnh | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy song song Vite (`http://localhost:5173`, đã mở LAN `host: true`) và Express server (`http://localhost:3000`), proxy `/api` |
| `npm run build` | Build tuần tự `shared` -> `client` -> `server` (tạo luôn PWA icons, `manifest.webmanifest`, `sw.js`) |
| `npm start` | Chạy server production phục vụ `client/dist` và API trên cùng `PORT` (mặc định `3000`) |
| `npm test` | Chạy toàn bộ unit & integration test bằng Vitest |
| `npm run typecheck` | Kiểm tra TypeScript (`tsc --noEmit`) cho cả 3 workspace |
| `npm run lint` | Kiểm tra ESLint (`no-explicit-any: error`) |

### Kiểm thử trên điện thoại thật qua Wi-Fi / LAN

1. Đảm bảo máy tính và điện thoại (iPhone / Android) dùng chung một mạng Wi-Fi.
2. Chạy `npm run dev` ở thư mục gốc (`client/vite.config.ts` đã bật `host: true`, hoặc chạy riêng client bằng `npm run dev --workspace=client -- --host`).
3. Xem địa chỉ LAN của máy tính (ví dụ `ipconfig` trên Windows để lấy IPv4 `192.168.x.x`), sau đó mở `http://<IP-máy-tính>:5173` trên Safari (iPhone) hoặc Chrome (Android).
4. Trên iPhone Safari: bấm nút **Chia sẻ → Thêm vào Màn hình chính** để chơi ở chế độ PWA toàn màn hình ngang, không thanh địa chỉ và hỗ trợ chạy offline cho asset tĩnh.

### Chế độ Debug & Xem trước đồ họa

- Mở `http://localhost:5173/?debug=1` để bật hitbox Arcade Physics, hiển thị FPS/tọa độ Pip và phím tắt debug:
  - `1` / `2` / `3`: nhảy thẳng tới màn 1-1 / 1-2 / 1-3
  - `G`: bật/tắt bất tử
  - `N`: qua màn ngay
  - `L`: +1 mạng
  - `T`: đặt đồng hồ còn 10 giây
  - `P` / `F` / `S`: chuyển Pip thành **Big** / **Fire** / **Nova Star**
- Mở `http://localhost:5173/?debug=1&sprites=1` để xem bảng toàn bộ sprite sheet (phóng to, chạy animation) và 47 tile autotile.
- Mở `http://localhost:5173/?debug=1&shot=1&theme=grass` (hoặc `cave`, `castle`) để xem khung cảnh trình diễn từng theme (nhấn `1`/`2`/`3` để chuyển theme). Ảnh chụp kiểm tra chất lượng được lưu tại `docs/screenshots/`.

---

## Thay thế bằng Asset ngoài (Override)

Bạn có thể thay thế bất kỳ sprite/tileset nào bằng file PNG tự vẽ (ví dụ từ Aseprite hoặc CC0 pack) mà không cần sửa code:

1. Đặt file `<key>.png` (và `<key>.json` nếu là atlas) vào `client/public/assets/override/`.
2. Khai báo key và kích thước frame trong `client/public/assets/override/manifest.json`:

```json
{
  "overrides": [
    { "key": "pip-small", "frameWidth": 16, "frameHeight": 16 }
  ]
}
```

### Danh sách key và kích thước frame

| Key | Kích thước frame | Số frame & Animation |
| :--- | :--- | :--- |
| `pip-small` | `16 × 16` | 27 frame (`0..3` idle, `4` blink, `5..8` walk, `9..14` run, `15..18` jump/peak/fall/land, `19` skid, `20` crouch, `21` look-up, `22` die, `23..24` victory, `25` grow, `26` shoot) |
| `pip-big`, `pip-fire` | `16 × 32` | 27 frame (thứ tự giống `pip-small`) |
| `blob` | `16 × 16` | 5 frame (`0..3` walk, `4` squashed) |
| `shellbug` | `16 × 24` | 4 frame (`0..3` walk) |
| `shell` | `16 × 16` | 5 frame (`0` idle, `1..4` spin) |
| `magma-king` | `48 × 48` | 8 frame (`0..3` idle, `4` anticipation, `5` jump, `6` hurt, `7` die) |
| `question-block` | `16 × 16` | 12 frame (`0..11` pulse + diagonal glint) |
| `used-block`, `brick-grass`, `brick-cave`, `brick-castle` | `16 × 16` | 1 frame |
| `lava-anim` | `16 × 16` | 4 frame |
| `gem` | `16 × 16` | 6 frame |
| `power-cell`, `one-up` | `16 × 16` | 2 frame |
| `flame-core`, `nova-star` | `16 × 16` | 4 frame |
| `fireball` | `8 × 8` | 4 frame |
| `boss-bullet` | `8 × 8` | 2 frame |
| `tileset` | `16 × 16` | 155 ô (`1..49` grass autotile 47+2, `50..98` cave, `99..147` castle, `148` hard block, `149..152` pipe, `153` bridge, `154` lava) |

---

## Bảng điều khiển

| Hành động | Bàn phím | Gamepad | Cảm ứng (Điện thoại) |
| :--- | :--- | :--- | :--- |
| Di chuyển trái / phải | `←` / `→` hoặc `A` / `D` | D-pad / Analog trái | Cụm `◀` / `▶` HTML góc dưới trái (trượt ngón chuyển hướng mượt) hoặc **Joystick ảo** |
| Cúi / Chui ống | `↓` hoặc `S` | D-pad xuống / Analog xuống | Vuốt xuống trên cụm di chuyển `◀` / `▶` |
| Nhảy | `Space` / `W` / `↑` / `Z` | Nút `A` | Nút `NHẢY` (`80 CSS px` mặc định) góc dưới phải — giữ để nhảy cao |
| Chạy nhanh | Giữ `Shift` hoặc `K` | Nút `X` | Nút `CHẠY` (`64 CSS px`, hỗ trợ trượt ngón nối giữa `CHẠY` ↔ `NHẢY`, hoặc bật **Luôn chạy** trong Settings) |
| Bắn cầu lửa (khi có Flame Core) | `J` / `X` / nút Chạy | Nút `X` | Nút `CHẠY` (hoặc `BẮN` khi bật Luôn chạy) |
| Tạm dừng | `Esc` hoặc `P` | Nút `Start` | Nút `\|\|` (`40 CSS px`) góc trên phải (hiện trong lúc chơi) |
| Tắt / Bật âm thanh & Tuỳ chỉnh mobile | `M` | — | Vào **CÀI ĐẶT** chỉnh kích thước/độ mờ nút, đổi tay trái, Joystick, kéo-thả vị trí nút, rung và chất lượng hiệu ứng |

---

## Cách thêm màn chơi mới

1. Tạo file mới trong `client/src/levels/` (ví dụ `level1_4.ts`) export `LevelSource` gồm đúng **15 hàng**, mọi hàng có độ dài bằng nhau.
2. Sử dụng các ký tự trong `client/src/levels/legend.ts`:
   - `.` trống | `#` đất (tự chọn mặt trên/thân) | `X` khối cứng | `B` gạch | `?` khối hỏi (Gem)
   - `M` khối Power-up | `*` khối Nova Star | `U` khối ẩn 1UP | `G` gạch nhiều Gem | `C` Gem lơ lửng
   - `[ ] { }` ống nước | `p` ống chui vào phòng bonus | `L` dung nham | `=` cầu đi xuyên từ dưới
   - `^` / `v` moving platform ngang/dọc | `R` tâm thanh lửa xoay | `E` Blob | `K` Shellbug | `W` Magma King
   - `S` điểm xuất phát (duy nhất 1) | `c` checkpoint | `F` chân cột cờ | `D` cửa kết thúc
3. Đăng ký màn vào `MAIN_LEVELS` trong `client/src/systems/GameSession.ts` và thêm `LevelId` vào `shared/src/validation.ts` nếu mở rộng campaign.
4. Chạy `npm test` — bộ test trong `client/src/levels/levels.test.ts` sẽ tự động chạy `parseLevel()` và BFS `validateLevelReachability()` để xác minh màn đi được từ `S` tới `F`/`D`.

---

## Tinh chỉnh cảm giác điều khiển (`client/src/config.ts`)

Mọi thông số vật lý và gameplay đều tập trung tại `client/src/config.ts`:
- Bước logic cố định: `FIXED_STEP_HZ = 60` (`FIXED_DT_MS = 1000 / 60`).
- `PHYSICS_CONFIG`: `JUMP_VELOCITY` (-400), `RUN_JUMP_VELOCITY` (-430 khi `|vx| > 140`), `GRAVITY_RISE_HOLD` (1100), `GRAVITY_RISE_RELEASE` (3200), `GRAVITY_FALL` (1700), `APEX_GRAVITY_MULT` (0.6 khi `|vy| < 40` và đang giữ nhảy), `MAX_FALL_SPEED` (480, chỉ kẹp chiều rơi xuống), `MIN_JUMP_TIME_MS` (50), `COYOTE_TIME_MS` (110), `JUMP_BUFFER_MS` (130), `STOMP_BOUNCE` (-300) / `STOMP_BOUNCE_HOLD` (-430), `WALK_MAX_SPEED` (110), `RUN_MAX_SPEED` (210), `CORNER_CORRECTION_PX` (4), `PREVENT_BACKTRACK` (true).
- `GAMEPLAY_CONFIG`: `FIREBALL_SPEED`, `ENEMY_SPEED`, `SHELL_SLIDE_SPEED`, `STOMP_COMBO`, `PLATFORM_RANGE_PX`, `FIREBAR_DEG_PER_SEC`.

---

## Deploy lên Render

1. Tạo Web Service trên Render trỏ vào thư mục gốc `pixel-hero`.
2. Cấu hình:
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`
   - **Environment Variables**:
     - `NODE_ENV=production`
     - `PORT=3000` (Render tự cấp biến `PORT`)
     - `DB_PATH=/var/data/scores.db`
3. Gắn một **Persistent Disk** tại mount path `/var/data` để dữ liệu SQLite (`scores.db`) không bị mất khi redeploy.

---

## API Docs

| Method & Path | Mô tả | Request / Response |
| :--- | :--- | :--- |
| `GET /api/health` | Kiểm tra server | `200 { "ok": true }` |
| `GET /api/leaderboard?limit=10` | Lấy BXH (`limit` tối đa 50, sắp theo `score DESC, durationSec ASC`) | `200 LeaderboardEntry[]` |
| `POST /api/score` | Gửi điểm (`{ name, score, level, durationSec, gems, kills }`) | `201 { id, rank }` / `400` / `429` |

Giới hạn tần suất (Rate Limit): tối đa **5 POST / phút / IP** và **60 GET / phút / IP**.

---

## Quyết định thiết kế

1. **Phiên bản `better-sqlite3@^13.2.0` cho Node 24**: Node.js `v24.12.0` trên Windows không có prebuild sẵn cho `better-sqlite3@11.x`; nâng lên `^13.2.0` giúp cài đặt prebuild trực tiếp không cần cài Visual Studio C++ Build Tools.
2. **Bitmap font 5×7 kết hợp Text độ phân giải cao cho tiếng Việt**: Tạo bitmap font `pixel-font` 5×7 bằng `RetroFont.Parse` cho logo, HUD và điểm bay; dùng `Phaser.GameObjects.Text` (`resolution: 2`, `monospace`) cho các nhãn tiếng Việt có dấu để hiển thị rõ nét mọi dấu thanh.
3. **HTML Input overlay cho nhập tên ở GameOver / Victory**: Dùng `<input>` HTML đặt nổi đồng bộ tọa độ khi nhập tên gửi điểm nhằm hỗ trợ tốt cả bàn phím máy tính, bộ gõ tiếng Việt (Telex/VNI) và bàn phím ảo trên điện thoại.
4. **Anti-cheat trần điểm (`server/src/antiCheat.ts`)**:
   - Màn `1-1`: thời gian tối thiểu `30s`, trần điểm `95.000`, tối đa `150` gem / `60` kills.
   - Màn `1-2`: thời gian tối thiểu `60s`, trần điểm `210.000`, tối đa `320` gem / `120` kills.
   - Màn `1-3`: thời gian tối thiểu `90s`, trần điểm `340.000`, tối đa `480` gem / `180` kills.
   - Kết hợp kiểm tra công thức phụ thuộc số gem/kills thực tế để chặn gửi điểm giả mạo nhưng vẫn thoải mái cho người chơi đạt combo cao.
5. **Phòng bonus `1-2-bonus`**: Lưu vị trí quay lại (`returnX`, `returnY`) và `timeRemaining` vào `GameSession` khi Pip nhấn `↓` trên ống `p` ở `1-2`, trả Pip ra tại ống thoát ở cột 127 khi đi qua ống `p` trong phòng bonus.
6. **Tách `powerState.ts` và `tileIndex.ts`**: Tách logic thuần không phụ thuộc Phaser DOM để chạy Vitest nhanh gọn trong môi trường Node.
7. **Vật lý nhảy trọng lực bất đối xứng & bước cố định 60Hz (`stepPlayerVertical` trong `client/src/entities/jumpPhysics.ts`)**:
   - Thay hoàn toàn cơ chế cắt nhảy `vy *= 0.45` phụ thuộc FPS (từng làm máy 120Hz nhảy thấp hơn) và bỏ `setMaxVelocityY` hai chiều vốn kẹp nhầm vận tốc đi lên. Chuyển toàn bộ logic gameplay + `this.physics.disableUpdate()` + `world.singleStep()` sang accumulator 60Hz cố định; tách `stepPlayerVertical` thuần để `validator.ts` (`computeJumpMetrics()`) và Vitest dùng chung một nguồn chân lý.
   - Tinh chỉnh `GRAVITY_RISE_RELEASE = 3200` và `MIN_JUMP_TIME_MS = 50` (thay vì `2400` / `80`) với `GRAVITY_RISE_HOLD = 1100`, `APEX_GRAVITY_MULT = 0.6`, `GRAVITY_FALL = 1700`: giữ nút khi đứng yên/đi bộ đạt ~`4.4` ô, đang chạy (`|vx| > 140`) đạt ~`5.2` ô, còn nhấp nhẹ 1 nhịp đạt ~`2.1` ô (`<= 2.5` ô) mượt mà không bị giật.
8. **Nút cảm ứng HTML Overlay (`HtmlTouchControls.ts`) & đa chạm theo `pointerId`**:
   - Chuyển nút cảm ứng từ Phaser canvas sang DOM overlay tính theo **CSS pixel** (`64px` di chuyển, `80px` Nhảy, `64px` Chạy/Bắn, `40px` Tạm dừng + `+12px` hitbox padding) để kích thước vật lý ổn định trên mọi mật độ DPI và đọc thẳng `env(safe-area-inset-*)`.
   - `TouchPointerTracker` + `setPointerCapture` giữ nguyên trạng thái khi `pointerout`, chỉ nhả ở `pointerup`/`pointercancel` của đúng `pointerId`, hỗ trợ trượt `◀`/`▶`, vuốt xuống để cúi, trượt giữa `CHẠY` ↔ `NHẢY`, Joystick ảo, `Luôn chạy`, tay trái và trình kéo-thả tuỳ chỉnh vị trí.
9. **Responsive Landscape (`viewport.ts`), PWA & Vòng đời Mobile (`MobileRuntime.ts`)**:
   - Giữ chiều cao logic `240`, co giãn chiều rộng `360..560` theo tỉ lệ viewport thực để xoá viền đen trên màn hình `16:9` / `19.5:9`; chặn zoom, pull-to-refresh, double-tap và context menu; hiện overlay hướng dẫn xoay ngang ở portrait và màn hình `Tiếp tục` khi quay lại ngang.
   - Đóng gói PWA (`vite-plugin-pwa` + icon PNG `192/512` + CSP `worker-src`/`manifest-src 'self'`), tự động khôi phục Web Audio từ cả trạng thái `'suspended'` và `'interrupted'` trên iOS Safari, và tự hạ `effectQuality` từ `'auto'` sang `'low'` nếu FPS trung bình dưới `50` trong 3 giây liên tục.

---

## Hạn chế đã biết

- Chưa tích hợp Playwright full E2E suite trong `devDependencies` để giữ thời gian cài đặt nhẹ; thay vào đó đã kiểm thử smoke bằng Google Chrome headless qua Chrome DevTools Protocol và kiểm thử toàn diện parser, BFS validator, physics state machine, ScoreManager, SaveManager và Express/SQLite API bằng Vitest + Supertest.
- Chunk JavaScript của Phaser sau minify (~1.67 MB) có cảnh báo kích thước bundle từ Vite (bình thường đối với engine Phaser 3 đóng gói đơn file).
