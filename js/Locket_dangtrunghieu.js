/***********************************************
> Locket Gold & AI Effects Script by dangtrunghieu
***********************************************/

// ========= Mapping Configuration ========= //
const mapping = {
  '%E8%BD%A6%E7%A5%A8%E7%A5%A8': ['vip', 'watch_vip'],
  'Locket': ['Gold', 'locket_1600_1y']
};

var ua = $request.headers["User-Agent"] || $request.headers["user-agent"] || "",
    obj = {};

try {
  obj = JSON.parse($response.body);
} catch (e) {
  obj = {};
}

// Thêm thông báo
obj.Attention = "Chúc mừng bạn! Vui lòng không bán hoặc chia sẻ cho người khác!";

// Khởi tạo an toàn các object con tránh crash
if (!obj.subscriber) obj.subscriber = {};
if (!obj.subscriber.subscriptions) obj.subscriber.subscriptions = {};
if (!obj.subscriber.entitlements) obj.subscriber.entitlements = {};

// Cấu hình Subscription
var dangtrunghieu = {
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
  expires_date: "9999-01-09T10:10:14Z",
  grace_period_expires_date: null,
  refunded_at: null,
  unsubscribe_detected_at: null,
  original_purchase_date: "2007-09-02T00:00:00Z",
  purchase_date: "2007-09-02T00:00:00Z",
  store: "app_store",
  store_transaction_id: "2000001108724193"
};

// Cấu hình Entitlement cơ bản
var locketGold = {
  grace_period_expires_date: null,
  purchase_date: "2007-09-02T00:00:00Z",
  product_identifier: "locket_1600_1y",
  expires_date: "9999-01-09T10:10:14Z"
};

// ========= Match & Inject Process ========= //
const match = Object.keys(mapping).find(e => ua.includes(e));

if (match) {
  let [entitlementKey, productId] = mapping[match];
  if (productId) {
    locketGold.product_identifier = productId;
    obj.subscriber.subscriptions[productId] = dangtrunghieu;
    obj.subscriber.entitlements[entitlementKey] = locketGold;
  } else {
    obj.subscriber.subscriptions["locket_1600_1y"] = dangtrunghieu;
    obj.subscriber.entitlements[entitlementKey] = locketGold;
  }
} else {
  obj.subscriber.subscriptions["locket_1600_1y"] = dangtrunghieu;
  obj.subscriber.entitlements["Gold"] = locketGold;
}

// ========= Mở khóa toàn bộ AI & Holiday Effects mới ========= //
const extraAiEntitlements = [
  "gold",
  "gold_membership",
  "locket_gold",
  "ai_effects",
  "holiday_effects",
  "premium"
];

extraAiEntitlements.forEach(key => {
  obj.subscriber.entitlements[key] = locketGold;
});

$done({
  body: JSON.stringify(obj)
});
