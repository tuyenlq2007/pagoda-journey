# Về chốn Đạo tràng — hành trình 3D theo cuộn

Trải nghiệm web cuộn trang: camera bay từ trên cao xuống phố, tới mặt tiền ngôi nhà đạo tràng,
xuyên qua ô kính tầng ba sáng vàng và đi vào chánh điện, kết thúc trước bàn thờ Tam Bảo.

Công nghệ: Three.js (mô hình dựng thủ tục), GSAP ScrollTrigger (scrub camera), Vite.

## Chạy

```bash
npm install
npm run dev
```

Mở địa chỉ Vite in ra (mặc định http://localhost:5173) và cuộn chuột.

Bản build tĩnh: `npm run build` rồi `npm run preview` (thư mục `dist/` có thể đưa lên bất kỳ host tĩnh nào).

Mẹo kiểm tra: thêm `?p=0.6` vào URL để đóng băng hành trình tại một vị trí (0 → 1).

## Cấu trúc

- `src/exterior.js` — khu phố (toàn bộ mặt bằng ngoài được giãn ×√2 theo phương ngang qua hằng `AREA_K`, tức diện tích ×2), ngôi nhà góc phố (theo ảnh drone DJI_*): tường trắng, ban công trồng cây, mái giàn thép, mái kính, bể nước.
- `src/interior.js` — chánh điện (theo p1–p5): tường cam, chân tường đỏ, phào xanh, diềm hoa văn, mandala trần, khám gỗ vòm, tượng Phật, đèn bơ, thangka, bàn và bồ đoàn.
- `src/textures.js` — texture vẽ bằng canvas (mandala, diềm, sàn xương cá, đá…).
- `src/story.js` — các chương chữ và mốc cuộn.
- `src/main.js` — renderer, hậu kỳ bloom, đường bay camera, ScrollTrigger.
- `public/photos/` — ảnh gốc thu nhỏ (dùng cho thẻ "Ảnh thực tế" và ô kính tầng ba).
- `public/textures/thangka_*.jpg` — 8 bức thangka cắt từ ảnh p3.

## Tượng 3D trên bàn thờ

`public/models/` chứa bản tối ưu cho web từ model gốc của bạn (dùng `@gltf-transform/cli`: giảm lưới, nén meshopt, texture webp):

| File | Nguồn | Tam giác | Dung lượng |
| --- | --- | --- | --- |
| `vajrasattva_hi.glb` | Downloads/vajrasattva-full/export/Vajrasattva_textured.glb (235 MB, 3,5 triệu tam giác, texture 8K) | ~210k, texture 2K | 3,5 MB |
| `vajrasattva_lo.glb` | như trên | ~35k, texture 512 | 0,7 MB |
| `tara_hi.glb` | Downloads/tara/tara.gltf (97 MB, triangle strip, không có vật liệu) | ~130k | 0,4 MB |
| `tara_lo.glb` | như trên | ~54k | 0,16 MB |

Hiện tất cả các khám đều đặt tượng Tara (phủ vàng vì file gốc không có màu): khám lớn dùng bản `tara_hi`, khám nhỏ dùng `tara_lo`. Model Vajrasattva vẫn để trong `public/models` nhưng không dùng; đổi `g.userData.kind` trong `src/interior.js` nếu muốn dùng lại.
Cấu hình trong `STATUE_MODELS` ở `src/interior.js`.

Cập nhật: tượng lớn ở khám giữa là `vajrasattva_full_hi.glb`, chuyển từ `Vajrasattva_full.fbx` bằng Blender (1,5 triệu tam giác, giảm còn khoảng 230 nghìn đỉnh, 1,5 MB). File FBX này không kèm texture và không có UV (màu đỉnh toàn trắng), nên tượng được phủ vàng trong code giống Tara. Các khám còn lại là Tara.

Cập nhật: các khám nhỏ dùng `tara_retopo_hi.glb` (khoảng 310k tam giác, 1 MB) và `tara_retopo_lo.glb` (khoảng 74k, 0,26 MB), chuyển từ `Downloads/Retopology.fbx` (183 MB, gồm thân, đầu, mắt và trang sức, tổng 5,4 triệu tam giác) bằng Blender rồi gộp thành một mesh. File không kèm texture nên được phủ vàng trong code.
