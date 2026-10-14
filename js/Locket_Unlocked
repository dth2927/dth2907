// ========= ID ========= //
const mapping = {
  'Locket': ['Gold']
};

// =========  Phần cố định  ========= // 
// =========  @hieuu02092007 - Đặng Trung Hiếu ========= // 

var ua = $request.headers["User-Agent"] || $request.headers["user-agent"],
  obj = JSON.parse($response.body);

// Thông báo khi kiểm tra phản hồi
obj.Attention = "Được mở khóa bởi Đặng Trung Hiếu (@hieuu02092007) - Vui lòng không bán hoặc chia sẻ!";

// Cấu hình gói thuê bao
var dth2927 = {
  auto_resume_date: null,
  display_name: "locket_1600_1y",
  is_sandbox: false,
  ownership_type: "PURCHASED",
  billing_issues_detected_at: null,
  management_url: "https://apps.apple.com/account/subscriptions",
  period_type: "normal",
  price: {
    "amount": 399000.0,
    "currency": "VND"
  },
  expires_date: "9999-09-02T00:00:00Z",
  grace_period_expires_date: null,
  refunded_at: null,
  unsubscribe_detected_at: null,
  original_purchase_date: "2007-09-02T00:00:00Z",
  purchase_date: "2007-09-02T00:00:00Z",
  store: "app_store",
  store_transaction_id: "20000002092007"
};

// Cấu hình quyền lợi VIP (Entitlements)
var locketGold = {
  grace_period_expires_date: null,
  purchase_date: "2007-09-02T00:00:00Z",
  product_identifier: "locket_1600_1y",
  expires_date: "9999-09-02T00:00:00Z"
};

// Đảm bảo các đối tượng con tồn tại tránh lỗi dữ liệu rỗng
if (!obj.subscriber) obj.subscriber = {};
if (!obj.subscriber.subscriptions) obj.subscriber.subscriptions = {};
if (!obj.subscriber.entitlements) obj.subscriber.entitlements = {};

const match = Object.keys(mapping).find(e => ua.includes(e));

if (match) {
  let [e, s] = mapping[match];
  if (s) {
    locketGold.product_identifier = s;
    obj.subscriber.subscriptions[s] = dth2927;
  } else {
    obj.subscriber.subscriptions["locket_1600_1y"] = dth2927;
  }
  obj.subscriber.entitlements[e] = locketGold;
} else {
  obj.subscriber.subscriptions["locket_1600_1y"] = dth2927;
  obj.subscriber.entitlements.pro = locketGold;
}

$done({
  body: JSON.stringify(obj)
});
