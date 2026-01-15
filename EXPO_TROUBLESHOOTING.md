# Expo Troubleshooting Guide

This guide helps you resolve common issues when running the Memark Expo app.

## Table of Contents

- [Tunnel Source Not Present Error](#tunnel-source-not-present-error)
- [Connection Modes](#connection-modes)
- [QR Code Scanning Issues](#qr-code-scanning-issues)
- [Cache and Reset](#cache-and-reset)
- [Network Requirements](#network-requirements)
- [Common Errors](#common-errors)

---

## Tunnel Source Not Present Error

**Problem:** You see "tunnel source not present" when running `npm run dev`

**Solution:** The app now uses LAN mode by default instead of tunnel mode. This is more reliable for local development.

### Why the Change?

- Tunnel mode relies on ngrok which often fails or times out
- LAN mode provides faster, more stable connections
- Works better for both iOS and Android devices on the same network

### What Changed

The default dev script now uses:
```bash
npm run dev  # Uses --lan flag
```

If you need tunnel mode for specific reasons:
```bash
npm run dev:tunnel
```

---

## Connection Modes

Memark supports three connection modes:

### 1. LAN Mode (Default - Recommended)

**Best for:** Local development on the same WiFi network

**How to use:**
```bash
npm run dev
```

**Requirements:**
- Your computer and phone must be on the same WiFi network
- Firewall must allow connections on port 8081
- Some corporate/public networks may block this

**How to connect:**
1. Run `npm run dev`
2. Open Expo Go app on your phone
3. Scan the QR code
4. Wait for bundle to load

### 2. Localhost Mode

**Best for:** Web development or when LAN doesn't work

**How to use:**
```bash
npm run dev:localhost
```

**Note:** This only works for web preview, not mobile devices

### 3. Tunnel Mode

**Best for:** When LAN mode doesn't work (different networks, firewall issues)

**How to use:**
```bash
npm run dev:tunnel
```

**Warning:** Less reliable, may timeout or fail to connect

---

## QR Code Scanning Issues

### Problem: QR Code Won't Scan

**Solutions:**

1. **Ensure devices are on same network**
   - Check WiFi settings on both devices
   - Disable VPN if active
   - Switch to LAN mode if using tunnel

2. **Manually enter URL**
   - In Expo Go, tap "Enter URL manually"
   - Type the URL shown in terminal (e.g., `exp://192.168.1.100:8081`)

3. **Use different connection mode**
   ```bash
   npm run dev:tunnel  # Try tunnel if LAN fails
   ```

### Problem: "Unable to Connect" After Scanning

**Solutions:**

1. **Check firewall settings**
   ```bash
   # macOS - Allow incoming connections
   System Preferences > Security & Privacy > Firewall

   # Windows - Allow Node.js through firewall
   Control Panel > System and Security > Windows Defender Firewall
   ```

2. **Verify network connectivity**
   ```bash
   # Ping your computer from another device
   ping 192.168.1.100  # Replace with your IP
   ```

3. **Restart Expo server**
   ```bash
   npm run reset
   ```

---

## Cache and Reset

### Full Reset Command

When things aren't working, do a full reset:

```bash
npm run reset
```

This command:
1. Removes `.expo` cache directory
2. Clears `node_modules/.cache`
3. Restarts Expo with fresh state
4. Uses LAN mode

### Manual Reset Steps

If the reset command doesn't work:

```bash
# Stop all running processes
# Press Ctrl+C in terminal

# Remove cache manually
rm -rf .expo
rm -rf node_modules/.cache

# Clear Metro bundler cache
npx expo start --clear

# Or use LAN mode explicitly
npx expo start --clear --lan
```

### Clear Expo Go Cache (Mobile)

**iOS:**
1. Open Expo Go app
2. Shake device to open menu
3. Tap "Reload"
4. If that doesn't work, delete and reinstall Expo Go

**Android:**
1. Open Expo Go app
2. Shake device to open menu
3. Tap "Reload"
4. Or: Settings > Apps > Expo Go > Clear Cache

---

## Network Requirements

### Firewall Rules

Allow these on your development machine:

- **Port 8081:** Metro bundler (required)
- **Port 19000:** Expo DevTools (optional)
- **Port 19001:** Expo server (required for LAN mode)

### Corporate/Public Networks

If you're on a restricted network:

1. **Try tunnel mode:**
   ```bash
   npm run dev:tunnel
   ```

2. **Use USB debugging (Android):**
   ```bash
   adb reverse tcp:8081 tcp:8081
   npm run dev:localhost
   ```

3. **Use localhost mode for web:**
   ```bash
   npm run dev:localhost
   # Then open http://localhost:8081 in browser
   ```

### VPN Issues

If using VPN:

1. Disable VPN temporarily
2. Or add exception for local network (192.168.x.x)
3. Or use tunnel mode

---

## Common Errors

### Error: "Couldn't start project on Android"

**Solution:**
```bash
# Check if port is in use
lsof -ti:8081  # macOS/Linux
netstat -ano | findstr :8081  # Windows

# Kill the process if needed
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# Restart Expo
npm run dev
```

### Error: "Module not found"

**Solution:**
```bash
# Reinstall dependencies
rm -rf node_modules
npm install

# Clear cache and restart
npm run reset
```

### Error: "Unable to resolve module"

**Solution:**
```bash
# Clear watchman (macOS/Linux)
watchman watch-del-all

# Clear cache
npm run reset
```

### Error: "Expo Go app shows red screen"

**Solution:**
1. Check error message carefully
2. Look for syntax errors in your code
3. Reload app (shake device, tap Reload)
4. Clear cache and restart server

### Error: "Network request failed"

**Solution:**
1. Check internet connection
2. Verify phone and computer are on same WiFi
3. Try tunnel mode
4. Check firewall settings

---

## Development Tips

### Speed Up Development

1. **Enable Fast Refresh:**
   - Already enabled by default
   - Automatically reloads on file save

2. **Use LAN mode for speed:**
   ```bash
   npm run dev  # Faster than tunnel
   ```

3. **Keep Metro bundler running:**
   - Don't restart unless necessary
   - Fast Refresh will update automatically

### Multiple Devices

To test on multiple devices simultaneously:

1. Start development server:
   ```bash
   npm run dev
   ```

2. Scan QR code on each device
3. All devices will receive updates simultaneously

### Web Development

For web-only development:

```bash
npm run dev:localhost
# Open http://localhost:8081 in browser
```

---

## Getting Help

If you're still experiencing issues:

1. **Check Expo Status:** https://status.expo.dev
2. **Expo Documentation:** https://docs.expo.dev
3. **Expo Forums:** https://forums.expo.dev
4. **GitHub Issues:** Check if others have similar problems

### Reporting Issues

When reporting issues, include:

- Expo CLI version: `npx expo --version`
- Node version: `node --version`
- Operating system
- Connection mode used (LAN/tunnel/localhost)
- Full error message
- Steps to reproduce

---

## Quick Reference

| Command | Purpose |
|---------|---------|
| `npm run dev` | Start with LAN mode (default) |
| `npm run dev:localhost` | Start with localhost (web only) |
| `npm run dev:tunnel` | Start with tunnel mode |
| `npm run reset` | Full cache clear and restart |
| `npm run build:web` | Build for web deployment |

---

## Recommended Setup

For the best development experience:

1. **Use LAN mode** for daily development
2. **Keep devices on same network** as your computer
3. **Configure firewall** to allow Expo ports
4. **Use reset command** when things break
5. **Keep Expo Go updated** on your mobile devices

---

Last Updated: January 15, 2026
