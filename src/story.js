// Scroll story: progress ranges (0..1) and Vietnamese captions.
// SPLIT is where the camera passes through the glowing window into the hall.
export const SPLIT = 0.5;

export const CHAPTERS = [
  {
    id: 'intro', from: 0, to: 0.07, side: 'center',
    kicker: 'Một hành trình cuộn',
    title: 'Về chốn Đạo tràng',
    body: 'Từ trên cao xuống phố, qua ô cửa ánh vàng, vào tận chánh điện.',
  },
  {
    id: 'city', from: 0.09, to: 0.2, side: 'left',
    kicker: '01 — Từ trên cao',
    title: 'Giữa lòng phố thị',
    body: 'Giữa những dãy nhà phố trắng, bể nước inox và hàng cây xanh, có một ngôi nhà góc phố lặng lẽ khác thường.',
    photo: '/photos/dji_0084.jpg',
  },
  {
    id: 'house', from: 0.23, to: 0.35, side: 'right',
    kicker: '02 — Mặt tiền',
    title: 'Những khu vườn treo',
    body: 'Ban công trồng cây rủ xuống từng tầng, mái giàn thép như những thân cây, mái kính che lối vào.',
    photo: '/photos/dji_0087.jpg',
  },
  {
    id: 'light', from: 0.38, to: 0.46, side: 'left',
    kicker: '03 — Ô cửa tầng ba',
    title: 'Ánh vàng sau ô kính',
    body: 'Sau lớp kính, chánh điện sáng lên như một ngọn đèn giữa buổi chiều tà.',
  },
  {
    id: 'hall', from: 0.53, to: 0.62, side: 'right',
    kicker: '04 — Bước vào',
    title: 'Chánh điện',
    body: 'Những dãy bàn thấp, bồ đoàn đỏ thẫm, sàn gỗ xương cá dẫn thẳng tới bàn thờ.',
    photo: '/photos/p2.jpg',
  },
  {
    id: 'mandala', from: 0.64, to: 0.72, side: 'left',
    kicker: '05 — Ngước lên',
    title: 'Mandala trên trần',
    body: 'Giữa trần cam, một mandala đỏ viền xanh: vũ trụ thu lại trong một hình vuông và những vòng tròn.',
  },
  {
    id: 'thangka', from: 0.745, to: 0.83, side: 'right',
    kicker: '06 — Bức tường tranh',
    title: 'Những bức Thangka',
    body: 'Tám bức thangka dưới ánh đèn rọi, mỗi bức là một vị Phật, Bồ Tát để chiêm ngưỡng và quán tưởng.',
    photo: '/photos/p3.jpg',
  },
  {
    id: 'altar', from: 0.855, to: 0.94, side: 'left',
    kicker: '07 — Bàn thờ',
    title: 'Trước Tam Bảo',
    body: 'Những khám gỗ hình vòm, tượng Phật dát vàng và hàng đèn bơ lung linh.',
    photo: '/photos/p5.jpg',
  },
  {
    id: 'end', from: 0.96, to: 1.02, side: 'center',
    kicker: 'Dừng lại',
    title: 'Thở. Lắng nghe.',
    body: 'Cuộn lên để đi lại hành trình.',
  },
];

export function renderChapters(root) {
  root.innerHTML = CHAPTERS.map(c => `
    <section class="chapter chapter--${c.side}" data-chapter="${c.id}">
      <p class="chapter__kicker">${c.kicker}</p>
      <h2 class="chapter__title">${c.title}</h2>
      <p class="chapter__body">${c.body}</p>
      ${c.photo ? `<figure class="chapter__photo"><img src="${c.photo}" alt="" loading="lazy"><figcaption>Ảnh thực tế</figcaption></figure>` : ''}
    </section>`).join('');
}
