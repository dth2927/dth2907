/**
 * Locket Gold & AI Effects - Deep Bypass Version
 * Optimized by DangTrungHieu
 */

"use strict";

let obj;
try {
  obj = JSON.parse($response.body);
} catch (error) {
  // Bắt lỗi nếu server trả về chuỗi rỗng hoặc không phải JSON
  $done({}); 
}

if (obj && obj.subscriber) {
  // 1. Sinh dữ liệu động (Dynamic Payload) để đánh lừa hệ thống Cache AI
  const now = new Date();
  const currentDateStr = now.toISOString();
  const futureDateStr = "2099-12-31T23:59:59Z";
  
  // Format Transaction ID của Apple thường bắt đầu bằng 20000...
  const randomTxId = "20000" + Math.floor(Math.random() * 90000000000).toString();

  // 2. Phần biến Gold CHÍNH CHỦ của DangTrungHieu
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
    expires_date: futureDateStr,
    grace_period_expires_date: null,
    refunded_at: null,
    unsubscribe_detected_at: null,
    original_purchase_date: currentDateStr, // Ngày tạo tự động
    purchase_date: currentDateStr,          // Ngày tạo tự động
    store: "app_store",
    store_transaction_id: randomTxId        // ID ngẫu nhiên chống block
  };

  var locketGold = {
    grace_period_expires_date: null,
    purchase_date: currentDateStr,
    product_identifier: "locket_1600_1y",
    expires_date: futureDateStr
  };

  // 3. Khởi tạo an toàn (Memory/Object Safety)
  obj.subscriber.subscriptions = obj.subscriber.subscriptions || {};
  obj.subscriber.entitlements = obj.subscriber.entitlements || {};

  // 4. Inject dữ liệu Gói Mua mang tên dangtrunghieu
  obj.subscriber.subscriptions["locket_1600_1y"] = dangtrunghieu;

  // 5. Inject danh sách Quyền lợi bao quát (Bao trùm mọi keys AI Locket đang dùng)
  const targetEntitlements = [
    "Gold",
    "gold",
    "gold_membership",
    "locket_gold",
    "ai_effects",
    "holiday_effects",
    "premium",
    "plus"
  ];

  targetEntitlements.forEach(key => {
    obj.subscriber.entitlements[key] = locketGold;
  });

  // 6. DEEP BYPASS: Clear trắng lịch sử tiêu dùng AI (Consumables/Credits)
  if (obj.subscriber.non_subscriptions) {
    obj.subscriber.non_subscriptions = {};
  }

  // Đánh dấu bản quyền
  obj.Attention = "Deep Bypass Mode - By DangTrungHieu";
}

// Trả về JSON đã được modify
$done({ body: JSON.stringify(obj) });
