/*
Chức năng：Mở khóa VIP cao cấp Meitu Xiuxiu
Kịch bản：R·E
Link App：https://apps.apple.com/cn/app/%E7%BE%8E%E5%9B%BE%E7%A7%80%E7%A7%80/id416048305
Phiên bản hỗ trợ：Phiên bản mới nhất trong AppStore 9.3.80
Thời gian cập nhật：2022.1.17
Tele：https://t.me/tienich
*/

var responseBody = $response.body;
var requestUrl = $request.url;
var parsedBody = JSON.parse(responseBody);

// 1. Xử lý endpoint chi tiết gói VIP: /v1/h5/vip/sub_detail.json
if (requestUrl.indexOf('/v1/h5/vip/sub_detail.json') != -1) {
    parsedBody.data.old_vip_type = 0x4;
    parsedBody.data.is_expire = 0x0;
    parsedBody.data.sub_type = 0x8;
    parsedBody.data.expire_days = -0x3e7; // -999 ngày
    parsedBody.data.valid_time = 0x70db764d;
    parsedBody.data.invalid_time = 0x61e44882;
    parsedBody.data.is_valid_user = 0x1;
    
    // Thực hiện replace trực tiếp trên chuỗi body gốc nếu cần
    responseBody = $response.body
        .replace(/\"old_vip_type\"\:\d+/g, '"old_vip_type":4')
        .replace(/\"is_expire\"\:\d+/g, '"is_expire":0')
        .replace(/\"sub_type\"\:\d+/g, '"sub_type":8')
        .replace(/\"expire_days\"\:.*?/g, '"expire_days":-999')
        .replace(/\"screen_name\"\:\".*?\"/g, '"screen_name":"已破解"')
        .replace(/\"invalid_time\"\:\d+/g, '"invalid_time":1642340000');

// 2. Xử lý endpoint xác thực tài khoản chung
} else if (requestUrl.indexOf('/v1/account/verify_credentials.json') != -1) {
    responseBody = $response.body
        .replace(/\"old_vip_type\"\:\d+/g, '"old_vip_type":4')
        .replace(/\"is_expire\"\:\d+/g, '"is_expire":0')
        .replace(/\"sub_type\"\:\d+/g, '"sub_type":8')
        .replace(/\"expire_days\"\:.*?/g, '"expire_days":-999')
        .replace(/\"screen_name\"\:\".*?\"/g, '"screen_name":"已破解"')
        .replace(/\"invalid_time\"\:\d+/g, '"invalid_time":1642340000');
        
    parsedBody.data.valid_time = 0x61e44882;
    parsedBody.data.is_expire = 0x0;
    parsedBody.data.old_vip_type = 0x4;
    parsedBody.data.sub_type = 0x8;
    parsedBody.data.is_valid_user = 0x0;
    parsedBody.data.expire_days = -0x3e7;
    parsedBody.data.is_valid_user = 0x1;
    parsedBody.data.exchange_vip = 0x0;
    parsedBody.data.screen_name = "已破解";
    parsedBody.data.valid_time = 0x70db764d;
    responseBody = JSON.stringify(parsedBody);

// 3. Xử lý endpoint thông tin gói năm / cấu hình VIP khác
} else if (requestUrl.indexOf('/v1/vip/info') != -1) { // (đã giải mã từ khóa nhận diện gói)
    parsedBody.data.id = 0x5f9a3ff20f5b9000;
    parsedBody.data.valid_time = 0x61e445b0;
    parsedBody.data.is_expire = 0x0;
    parsedBody.data.vip_type = 0x65;
    parsedBody.data.expire_days = 0x70db764d;
    parsedBody.data.sub_name = '包年'; // Gói năm
    parsedBody.data.s = 0x1;
    parsedBody.data.is_valid_user = 0x2;
    parsedBody.data.id_str = '6888888888888888888';
    parsedBody.data.sub_biz_type = 0x1;
    parsedBody.data.gid = 0x9502f900;
    parsedBody.data.exchange_vip = 0x0;
    
    responseBody = $response.body
        .replace(/\"old_vip_type\"\:\d+/g, '"old_vip_type":4')
        .replace(/\"is_expire\"\:\d+/g, '"is_expire":0')
        .replace(/\"sub_type\"\:\d+/g, '"sub_type":8')
        .replace(/\"expire_days\"\:.*?/g, '"expire_days":-999')
        .replace(/\"screen_name\"\:\".*?\"/g, '"screen_name":"已破解"')
        .replace(/\"invalid_time\"\:\d+/g, '"invalid_time":1642340000');
    responseBody = JSON.stringify(parsedBody);

// 4. Xử lý endpoint dùng thử miễn phí (free trial)
} else if (requestUrl.indexOf('/v1/vip/free_trial') != -1) {
    responseBody = $response.body
        .replace(/\"free_trial\"\:\d+/g, '"free_trial":1')
        .replace(/\"vip_type\"\:\d+/g, '"vip_type":100')
        .replace(/\"screen_name\"\:\".*?\"/g, '"screen_name":"已破解"');

// 5. Xử lý các thông báo nhắc nhở giao diện trang chủ
} else if (requestUrl.indexOf('/v1/home/prompt') != -1) {
    responseBody = $response.body
        .replace(/\"home_prompt\"\:\".*?\"/g, '"home_prompt":"您的会员将于2030/01/01过期。"')
        .replace(/\"home_btn_prompt\"\:\".*?\"/g, '"home_btn_prompt":"已激活"')
        .replace(/\"beautify_btn_prompt\"\:\".*?\"/g, '"beautify_btn_prompt":""')
        .replace(/\"beautify_prompt\"\:\".*?\"/g, '"beautify_prompt":""');
}

$done({ body: responseBody });
