<?php
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");

// تعطيل حد الوقت للسماح بمعالجة البيانات الكبيرة
set_time_limit(0);

// تعريف القنوات المطلوبة
$REQUIRED_CHANNELS = [
    "BEIN SPORTS 1 (BACKUP) .b",
    "BEIN SPORTS 1 .b",
    "BEIN SPORTS 2 HD .b",
    "BEIN SPORTS 2 HD (BACKUP 2) .b",
    "BEIN SPORTS 3 HD .b",
    "BEIN SPORTS 3 (BACKUP) .b",
    "BEIN SPORTS 4 FHD .b",
    "BEIN SPORTS 4 HD (BACKUP 2) .b",
];

/**
 * دالة للحصول على توقيع المصادقة من VAVOO API
 * @return string|null التوقيع أو null في حالة الفشل
 */
function get_auth_signature() {
    $url = "https://www.vavoo.tv/api/app/ping";
    $headers = [
        "User-Agent: okhttp/4.11.0",
        "Accept: application/json",
        "Content-Type: application/json; charset=utf-8",
        "Accept-Encoding: gzip"
    ];

    $data = [
        "token" => "8Us2TfjeOFrzqFFTEjL3E5KfdAWGa5PV3wQe60uK4BmzlkJRMYFu0ufaM_eeDXKS2U04XUuhbDTgGRJrJARUwzDyCcRToXhW5AcDekfFMfwNUjuieeQ1uzeDB9YWyBL2cn5Al3L3gTnF8Vk1t7rPwkBob0swvxA",
        "reason" => "player.enter",
        "locale" => "de",
        "theme" => "dark",
        "metadata" => [
            "device" => [
                "type" => "Handset",
                "brand" => "google",
                "model" => "Nexus 5",
                "name" => "21081111RG",
                "uniqueId" => "d10e5d99ab665233"
            ],
            "os" => [
                "name" => "android",
                "version" => "7.1.2",
                "abis" => ["arm64-v8a", "armeabi-v7a", "armeabi"],
                "host" => "android"
            ],
            "app" => [
                "platform" => "android",
                "version" => "3.0.2",
                "buildId" => "288045000",
                "engine" => "jsc",
                "signatures" => ["09f4e07040149486e541a1cb34000b6e12527265252fa2178dfe2bd1af6b815a"],
                "installer" => "com.android.secex"
            ],
            "version" => [
                "package" => "tv.vavoo.app",
                "binary" => "3.0.2",
                "js" => "3.1.4"
            ]
        ],
        "appFocusTime" => 27229,
        "playerActive" => true,
        "playDuration" => 0,
        "devMode" => false,
        "hasAddon" => true,
        "castConnected" => false,
        "package" => "tv.vavoo.app",
        "version" => "3.1.4",
        "process" => "app",
        "firstAppStart" => 1728674705639,
        "lastAppStart" => 1728674705639,
        "ipLocation" => "",
        "adblockEnabled" => true,
        "proxy" => [
            "supported" => ["ss"],
            "engine" => "ss",
            "enabled" => false,
            "autoServer" => true,
            "id" => "ca-bhs"
        ],
        "iap" => [
            "supported" => false
        ]
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_ENCODING, "gzip");

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        error_log("خطأ في جلب التوقيع: " . curl_error($ch));
        curl_close($ch);
        return null;
    }
    curl_close($ch);

    $res_json = json_decode($response, true);
    return $res_json['addonSig'] ?? null;
}

/**
 * دالة لجلب قائمة القنوات من VAVOO API
 * @param string $signature التوقيع
 * @param string $group مجموعة القنوات (مثال: "Arabia")
 * @return array|null قائمة القنوات أو null في حالة الفشل
 */
function get_channel_list($signature, $group = "Arabia") {
    $url = "https://vavoo.to/vto-cluster/mediahubmx-catalog.json";
    $headers = [
        "Accept-Encoding: gzip",
        "User-Agent: MediaHubMX/2",
        "Accept: application/json",
        "Content-Type: application/json; charset=utf-8",
        "mediahubmx-signature: $signature"
    ];

    $cursor = 0;
    $all_items = [];

    while (true) {
        $data = [
            "language" => "en",
            "region" => "LY",
            "catalogId" => "vto-iptv",
            "id" => "vto-iptv",
            "adult" => false,
            "search" => "",
            "sort" => "name",
            "filter" => ["group" => $group],
            "cursor" => $cursor,
            "clientVersion" => "3.0.2"
        ];

        $ch = curl_init($url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        curl_setopt($ch, CURLOPT_ENCODING, "gzip");

        $response = curl_exec($ch);
        if (curl_errno($ch)) {
            error_log("خطأ في جلب قائمة القنوات: " . curl_error($ch));
            curl_close($ch);
            break;
        }
        curl_close($ch);

        $result = json_decode($response, true);
        $items = $result['items'] ?? [];
        if (empty($items)) {
            break;
        }

        $all_items = array_merge($all_items, $items);
        $cursor += count($items);
    }

    return $all_items;
}

/**
 * دالة لتصفية القنوات المطلوبة
 * @param array $channels قائمة القنوات
 * @return array القنوات المصفاة
 */
function filter_required_channels($channels) {
    global $REQUIRED_CHANNELS;
    $filtered_channels = [];
    foreach ($channels as $channel) {
        $name = $channel['name'] ?? '';
        if (in_array($name, $REQUIRED_CHANNELS)) {
            $filtered_channels[] = $channel;
            echo "تم جلب القناة: $name\n";
        }
    }
    return $filtered_channels;
}

/**
 * دالة لحل رابط القناة (محسنة)
 * @param string $link الرابط الأصلي
 * @param string $signature التوقيع
 * @return string|null الرابط المحلول أو null في حالة الفشل
 */
function resolve_link($link, $signature) {
    if (strpos($link, "localhost") !== false) {
        return $link;
    }

    $url = "https://vavoo.to/vto-cluster/mediahubmx-resolve.json";
    $headers = [
        "User-Agent: MediaHubMX/2",
        "Accept: application/json",
        "Content-Type: application/json; charset=utf-8",
        "Accept-Encoding: gzip",
        "mediahubmx-signature: $signature"
    ];

    $data = [
        "language" => "de",
        "region" => "AT",
        "url" => $link,
        "clientVersion" => "3.0.2"
    ];

    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_ENCODING, "gzip");

    $response = curl_exec($ch);
    if (curl_errno($ch)) {
        error_log("خطأ في حل الرابط '$link': " . curl_error($ch));
        curl_close($ch);
        return null;
    }
    curl_close($ch);

    $result = json_decode($response, true);
    if (empty($result) || !is_array($result) || !isset($result[0]['url'])) {
        error_log("فشل في حل الرابط '$link': استجابة غير صالحة - " . $response);
        return null;
    }

    return $result[0]['url'];
}

/**
 * دالة لإنشاء ملف M3U8 للقنوات المحددة
 * @param array $channels قائمة القنوات
 * @param string $signature التوقيع
 * @param string $filename اسم الملف
 */
function generate_m3u($channels, $signature, $filename = "bein_sports_channels.m3u8") {
    $content = "#EXTM3U\n";

    foreach ($channels as $idx => $item) {
        $name = $item['name'] ?? "غير معروف";
        $original_link = $item['url'] ?? '';
        if (empty($original_link)) {
            continue;
        }

        echo "معالجة القناة " . ($idx + 1) . "/" . count($channels) . ": $name\n";
        $resolved_url = resolve_link($original_link, $signature);

        if (empty($resolved_url)) {
            echo "فشل في حل رابط القناة $name\n";
            continue;
        }

        $content .= "#EXTINF:-1 tvg-id=\"$name\" tvg-name=\"$name\" group-title=\"BEIN SPORTS\",$name\n";
        $content .= "$resolved_url\n";
    }

    file_put_contents($filename, $content);
    echo "تم إنشاء ملف M3U8 بنجاح: $filename\n";
}

// التنفيذ الرئيسي
echo "جاري الحصول على توقيع المصادقة...\n";
$signature = get_auth_signature();
if (empty($signature)) {
    echo "فشل في الحصول على توقيع المصادقة.\n";
    exit(1);
}

echo "جاري جلب قائمة القنوات...\n";
$channels = get_channel_list($signature, "Arabia");
if (empty($channels)) {
    echo "فشل في جلب قائمة القنوات.\n";
    exit(1);
}

echo "جاري تصفية القنوات المطلوبة...\n";
$filtered_channels = filter_required_channels($channels);
if (empty($filtered_channels)) {
    echo "لم يتم العثور على القنوات المطلوبة.\n";
    exit(1);
}

echo "جاري إنشاء ملف M3U8...\n";
generate_m3u($filtered_channels, $signature);
echo "تم الانتهاء!\n";

?>
