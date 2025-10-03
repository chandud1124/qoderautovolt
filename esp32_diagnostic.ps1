# ESP32 Connectivity Diagnostic Script
# Run this to diagnose ESP32 offline issues

Write-Host "🔍 ESP32 Connectivity Diagnostic Tool" -ForegroundColor Cyan
Write-Host "=====================================" -ForegroundColor Cyan
Write-Host ""

# Configuration
$BackendIP = "172.16.3.171"
$MQTTPort = 1883
$HTTPPort = 3001
$WiFiSSID = "AIMS-WIFI"

function Test-NetworkConnectivity {
    Write-Host "1️⃣ Testing Network Connectivity" -ForegroundColor Yellow
    Write-Host "===============================" -ForegroundColor Yellow

    # Test backend server ping
    Write-Host "📡 Pinging backend server ($BackendIP)..." -NoNewline
    $ping = Test-Connection -ComputerName $BackendIP -Count 3 -Quiet
    if ($ping) {
        Write-Host " ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   ⚠️  ESP32 cannot reach backend server!" -ForegroundColor Yellow
    }

    # Test MQTT port
    Write-Host "🔗 Testing MQTT port ($BackendIP`:$MQTTPort)..." -NoNewline
    $mqttTest = Test-NetConnection -ComputerName $BackendIP -Port $MQTTPort -WarningAction SilentlyContinue
    if ($mqttTest.TcpTestSucceeded) {
        Write-Host " ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   ⚠️  MQTT broker not accessible!" -ForegroundColor Yellow
    }

    # Test HTTP port
    Write-Host "🌐 Testing HTTP port ($BackendIP`:$HTTPPort)..." -NoNewline
    $httpTest = Test-NetConnection -ComputerName $BackendIP -Port $HTTPPort -WarningAction SilentlyContinue
    if ($httpTest.TcpTestSucceeded) {
        Write-Host " ✅ SUCCESS" -ForegroundColor Green
    } else {
        Write-Host " ❌ FAILED" -ForegroundColor Red
        Write-Host "   ⚠️  Backend API not accessible!" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Get-MQTTConnections {
    Write-Host "2️⃣ Checking MQTT Connections" -ForegroundColor Yellow
    Write-Host "============================" -ForegroundColor Yellow

    # Get current MQTT connections
    $mqttConnections = netstat -ano | findstr ":1883" | findstr "ESTABLISHED"

    if ($mqttConnections) {
        Write-Host "📊 Active MQTT connections:" -ForegroundColor Green
        $esp32Count = 0
        foreach ($conn in $mqttConnections) {
            $parts = $conn -split '\s+'
            $remoteIP = $parts[2].Split(':')[0]
            if ($remoteIP -like "172.16.3.*") {
                Write-Host "   📱 ESP32: $remoteIP" -ForegroundColor Green
                $esp32Count++
            }
        }
        Write-Host "   📈 Total ESP32 devices connected: $esp32Count" -ForegroundColor Cyan
    } else {
        Write-Host "❌ No active MQTT connections found" -ForegroundColor Red
    }

    Write-Host ""
}

function Test-BackendHealth {
    Write-Host "3️⃣ Testing Backend Health" -ForegroundColor Yellow
    Write-Host "========================" -ForegroundColor Yellow

    try {
        $healthUrl = "http://$BackendIP`:$HTTPPort/health"
        Write-Host "🏥 Testing health endpoint: $healthUrl" -ForegroundColor Cyan

        $response = Invoke-RestMethod -Uri $healthUrl -TimeoutSec 10
        Write-Host "✅ Backend health check passed" -ForegroundColor Green
        Write-Host "   🗄️  Database: $($response.database)" -ForegroundColor Gray
        Write-Host "   ⏱️  Uptime: $([math]::Round($response.uptime, 2))s" -ForegroundColor Gray
        Write-Host "   🚀 Environment: $($response.environment)" -ForegroundColor Gray

    } catch {
        Write-Host "❌ Backend health check failed: $($_.Exception.Message)" -ForegroundColor Red
        Write-Host "   ⚠️  Backend server may be down or unreachable" -ForegroundColor Yellow
    }

    Write-Host ""
}

function Show-DiagnosticResults {
    Write-Host "4️⃣ Diagnostic Summary & Recommendations" -ForegroundColor Yellow
    Write-Host "=======================================" -ForegroundColor Yellow

    Write-Host "🔍 POSSIBLE CAUSES OF ESP32 OFFLINE ISSUES:" -ForegroundColor Cyan
    Write-Host ""

    Write-Host "1. 🔌 POWER SUPPLY ISSUES:" -ForegroundColor Yellow
    Write-Host "   • ESP32 requires stable 5V/1A power supply"
    Write-Host "   • Check voltage with multimeter"
    Write-Host "   • Try different power adapter"
    Write-Host "   • Check for loose connections"
    Write-Host ""

    Write-Host "2. 📶 WiFi CONNECTIVITY:" -ForegroundColor Yellow
    Write-Host "   • ESP32 may be too far from router"
    Write-Host "   • WiFi signal interference"
    Write-Host "   • Wrong WiFi credentials in config.h"
    Write-Host "   • Router may be blocking ESP32 MAC address"
    Write-Host ""

    Write-Host "3. 🔗 MQTT CONNECTION:" -ForegroundColor Yellow
    Write-Host "   • MQTT broker IP may be wrong in ESP32 code"
    Write-Host "   • Firewall blocking MQTT port (1883)"
    Write-Host "   • MQTT broker may be down"
    Write-Host "   • ESP32 may be connecting to wrong MQTT server"
    Write-Host ""

    Write-Host "4. 🔧 ESP32 HARDWARE/SOFTWARE:" -ForegroundColor Yellow
    Write-Host "   • ESP32 may be overheating"
    Write-Host "   • Memory corruption causing crashes"
    Write-Host "   • Watchdog timer resets"
    Write-Host "   • GPIO pin conflicts"
    Write-Host ""

    Write-Host "5. 🌐 NETWORK ISSUES:" -ForegroundColor Yellow
    Write-Host "   • DHCP server not assigning IPs"
    Write-Host "   • Router restarting frequently"
    Write-Host "   • Network congestion"
    Write-Host "   • DNS resolution problems"
    Write-Host ""

    Write-Host "🛠️  TROUBLESHOOTING STEPS:" -ForegroundColor Green
    Write-Host "1. Power cycle all ESP32 devices"
    Write-Host "2. Check ESP32 serial output (115200 baud)"
    Write-Host "3. Verify WiFi credentials in config.h"
    Write-Host "4. Test MQTT broker accessibility"
    Write-Host "5. Check router client list for ESP32 IPs"
    Write-Host "6. Monitor backend server logs"
    Write-Host "7. Update ESP32 firmware if needed"
    Write-Host ""

    Write-Host "📊 MONITORING:" -ForegroundColor Cyan
    Write-Host "• ESP32 status LED: Fast blink = WiFi disconnected"
    Write-Host "• ESP32 status LED: Slow blink = WiFi OK, MQTT disconnected"
    Write-Host "• ESP32 status LED: Solid ON = Fully connected"
    Write-Host "• Check backend logs for MQTT messages"
    Write-Host "• Monitor router DHCP client list"
    Write-Host ""
}

# Main execution
try {
    Test-NetworkConnectivity
    Get-MQTTConnections
    Test-BackendHealth
    Show-DiagnosticResults

    Write-Host "✅ Diagnostic complete!" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Next steps:" -ForegroundColor Cyan
    Write-Host "1. Address any FAILED tests above"
    Write-Host "2. Power cycle ESP32 devices"
    Write-Host "3. Monitor ESP32 serial output"
    Write-Host "4. Check backend server logs"
    Write-Host ""

} catch {
    Write-Host "❌ Diagnostic script error: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")