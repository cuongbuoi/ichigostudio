/**
 * Nội dung các trang chính sách (/chinh-sach/<slug>). Mỗi mục `body` là Markdown
 * (render bằng markdown-it, html tắt). Sửa câu chữ ở đây, không cần đụng template.
 * Mọi cam kết phải đúng thực tế của shop (chủ shop duyệt trước khi deploy).
 * Đổi `updated` khi sửa nội dung (dùng cho "Cập nhật" + dateModified trong JSON-LD).
 */

export interface PolicySection {
  heading: string
  body: string
}

export interface Policy {
  slug: string
  /** Tên ngắn cho footer / breadcrumb. */
  name: string
  h1: string
  /** <title>, 50-60 ký tự. */
  title: string
  /** Meta description, 130-150 ký tự. */
  description: string
  intro: string
  updated: string
  sections: PolicySection[]
}

const MESSENGER = 'https://m.me/ichigostudio.vn'
const UPDATED = '2026-10-31'

export const POLICIES: Policy[] = [
  {
    slug: 'van-chuyen',
    name: 'Vận chuyển',
    h1: 'Chính sách vận chuyển',
    title: 'Chính sách vận chuyển và giao hàng | Ichigo Studio',
    description: 'Giao hàng toàn quốc: nội thành TP.HCM qua Be, các khu vực khác qua SPX Express. Thời gian hoàn thiện đơn, phí vận chuyển và cách kiểm tra khi nhận.',
    intro: 'Ichigo Studio giao hàng trên toàn quốc. Trang này trình bày đơn vị vận chuyển, thời gian hoàn thiện đơn hàng, phí vận chuyển và cách kiểm tra khi nhận hàng.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Đơn vị vận chuyển',
        body: '- Nội thành TP. Hồ Chí Minh: giao qua Be.\n- Các khu vực khác: giao qua SPX Express.',
      },
      {
        heading: 'Thời gian hoàn thiện và giao hàng',
        body: 'Sản phẩm được in theo từng đơn hàng. Thời gian hoàn thiện tùy theo mẫu, trung bình từ 3 đến 4 ngày. Với đơn hàng số lượng lớn, thời gian khoảng 1 tuần. Thời gian cụ thể sẽ được thông báo khi xác nhận đơn.\n\nSau khi hoàn thiện, đơn hàng được bàn giao cho đơn vị vận chuyển. Thời gian giao phụ thuộc vào khu vực nhận hàng và đơn vị vận chuyển.',
      },
      {
        heading: 'Phí vận chuyển',
        body: 'Giá sản phẩm chưa bao gồm phí vận chuyển. Phí vận chuyển được thanh toán trực tiếp cho đơn vị giao hàng khi bạn nhận hàng, theo bảng giá của đơn vị đó.',
      },
      {
        heading: 'Đóng gói và nhận hàng',
        body: `Sản phẩm được đóng gói cẩn thận trước khi giao. Bạn vui lòng quay video khi mở hàng. Nếu có chi tiết bị gãy, bạn gửi video cho Ichigo Studio để được gửi bù chi tiết đó. Xem thêm tại [Chính sách đổi trả và bảo hành](/chinh-sach/doi-tra).`,
      },
      {
        heading: 'Theo dõi đơn hàng',
        body: 'Bạn có thể xem trạng thái đơn tại trang [Tra cứu đơn](/don-hang) bằng mã đơn hàng và số điện thoại đã dùng khi đặt.',
      },
    ],
  },
  {
    slug: 'doi-tra',
    name: 'Đổi trả và bảo hành',
    h1: 'Chính sách đổi trả và bảo hành',
    title: 'Chính sách đổi trả và bảo hành sản phẩm | Ichigo Studio',
    description: 'Sản phẩm in 3D theo đơn được gửi bù chi tiết khi gãy trong vận chuyển hoặc lỗi in, căn cứ video mở hàng. Xem điều kiện và cách gửi yêu cầu tại đây.',
    intro: 'Sản phẩm của Ichigo Studio được thiết kế và in 3D theo từng đơn hàng. Trang này trình bày các trường hợp Ichigo Studio gửi bù chi tiết và cách gửi yêu cầu.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Trường hợp được gửi bù chi tiết',
        body: '- Chi tiết bị gãy trong quá trình vận chuyển.\n- Chi tiết bị lỗi in.\n\nIchigo Studio gửi bù đúng chi tiết bị gãy hoặc bị lỗi.',
      },
      {
        heading: 'Điều kiện',
        body: 'Bạn vui lòng quay video khi mở hàng. Video mở hàng là căn cứ để Ichigo Studio xác nhận tình trạng sản phẩm lúc bạn nhận.',
      },
      {
        heading: 'Cách gửi yêu cầu',
        body: `1. Nhắn cho Ichigo Studio qua [Messenger](${MESSENGER}).\n2. Gửi mã đơn hàng và video mở hàng.\n3. Ichigo Studio kiểm tra và xác nhận chi tiết cần gửi bù.`,
      },
      {
        heading: 'Trường hợp không áp dụng',
        body: 'Sản phẩm được in theo từng đơn hàng, vì vậy Ichigo Studio không nhận đổi hoặc trả hàng khi bạn đổi ý sau khi đơn đã được thanh toán.\n\nĐồ chơi DX trong ảnh chỉ dùng để minh họa cách sử dụng phụ kiện và không bao gồm trong sản phẩm.',
      },
    ],
  },
  {
    slug: 'thanh-toan',
    name: 'Thanh toán',
    h1: 'Chính sách thanh toán',
    title: 'Chính sách thanh toán và huỷ đơn hàng | Ichigo Studio',
    description: 'Thanh toán trước toàn bộ giá trị sản phẩm bằng chuyển khoản VietQR, phí vận chuyển trả khi nhận. Xem cách xác nhận thanh toán và quy định huỷ đơn.',
    intro: 'Trang này trình bày hình thức thanh toán, thời điểm thanh toán và quy định huỷ đơn tại Ichigo Studio.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Hình thức thanh toán',
        body: 'Khi đặt hàng trên website, bạn thanh toán bằng chuyển khoản ngân hàng qua mã VietQR hiển thị ở bước thanh toán. Khi đặt hàng qua Messenger, Ichigo Studio gửi thông tin thanh toán cho bạn trong cuộc trò chuyện.',
      },
      {
        heading: 'Thời điểm thanh toán',
        body: 'Đơn hàng được thanh toán trước toàn bộ giá trị sản phẩm để Ichigo Studio tiến hành in. Phí vận chuyển không nằm trong khoản thanh toán này và được thanh toán cho đơn vị giao hàng khi bạn nhận hàng.',
      },
      {
        heading: 'Xác nhận thanh toán',
        body: 'Bạn giữ nguyên nội dung chuyển khoản là mã thanh toán (bắt đầu bằng ICG) để hệ thống tự động xác nhận. Trang thanh toán chuyển sang trạng thái đã thanh toán khi giao dịch được ghi nhận. Bạn có thể xem lại đơn tại trang [Tra cứu đơn](/don-hang).',
      },
      {
        heading: 'Huỷ đơn và hoàn tiền',
        body: 'Sản phẩm được in theo từng đơn hàng, vì vậy đơn hàng đã thanh toán không thể huỷ. Trường hợp Ichigo Studio không thể thực hiện đơn hàng, Ichigo Studio hoàn lại toàn bộ số tiền bạn đã thanh toán.',
      },
      {
        heading: 'An toàn khi thanh toán',
        body: 'Ichigo Studio không yêu cầu và không lưu số thẻ, mật khẩu hay mã OTP ngân hàng của bạn. Bạn thực hiện chuyển khoản trên ứng dụng ngân hàng của mình.',
      },
    ],
  },
  {
    slug: 'bao-mat',
    name: 'Bảo mật',
    h1: 'Chính sách bảo mật',
    title: 'Chính sách bảo mật thông tin khách hàng | Ichigo Studio',
    description: 'Thông tin Ichigo Studio thu thập khi bạn đặt hàng, gửi file in 3D hoặc nhắn tin, mục đích sử dụng, đơn vị được chia sẻ và cách yêu cầu chỉnh sửa, xoá.',
    intro: 'Trang này trình bày thông tin Ichigo Studio thu thập khi bạn sử dụng website và đặt hàng, mục đích sử dụng và cách thông tin được chia sẻ.',
    updated: UPDATED,
    sections: [
      {
        heading: 'Thông tin được thu thập',
        body: '- Khi đặt hàng: họ tên, số điện thoại, địa chỉ nhận hàng và ghi chú đơn hàng.\n- Khi gửi yêu cầu in 3D: file 3D (.stl, .3mf, .obj) cùng tên và số điện thoại nếu bạn cung cấp.\n- Khi nhắn tin qua Messenger: nội dung cuộc trò chuyện với Ichigo Studio.\n- Khi truy cập website: dữ liệu về cách sử dụng website như trang đã xem và thao tác trên trang, qua Google Analytics và Contentsquare.',
      },
      {
        heading: 'Mục đích sử dụng',
        body: '- Xử lý, giao đơn hàng và liên hệ với bạn về đơn hàng.\n- Báo giá và thực hiện yêu cầu in 3D.\n- Cho phép bạn tra cứu đơn bằng mã đơn và số điện thoại.\n- Cải thiện nội dung và trải nghiệm trên website.',
      },
      {
        heading: 'Chia sẻ thông tin',
        body: 'Ichigo Studio chỉ cung cấp họ tên, số điện thoại và địa chỉ nhận hàng cho đơn vị vận chuyển (Be, SPX Express) để giao hàng. Ichigo Studio không bán hoặc trao đổi thông tin cá nhân của bạn cho bên thứ ba.',
      },
      {
        heading: 'Dữ liệu lưu trên thiết bị của bạn',
        body: 'Website lưu giỏ hàng và danh sách đơn đã đặt (mã đơn, số điện thoại) trong bộ nhớ trình duyệt trên thiết bị của bạn để bạn xem lại đơn nhanh hơn. Bạn có thể xoá dữ liệu này bằng cách xoá dữ liệu trang web trong trình duyệt.',
      },
      {
        heading: 'Quyền của bạn',
        body: `Bạn có thể yêu cầu xem, chỉnh sửa hoặc xoá thông tin cá nhân của mình bằng cách nhắn cho Ichigo Studio qua [Messenger](${MESSENGER}).`,
      },
    ],
  },
]

export function getPolicy(slug: string): Policy | undefined {
  return POLICIES.find((p) => p.slug === slug)
}
