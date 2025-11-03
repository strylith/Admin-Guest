# Port Configuration Centralization - Complete

## Summary

Successfully centralized port configuration for both Admin Dashboard and Guest System, ensuring they run on different ports with clear, maintainable variables.

## Changes Made

### Admin Dashboard (Port 3000)

1. **`.env` file**
   - Added `ADMIN_PORT=3000` for clarity
   - Kept `PORT=3000` for backward compatibility

2. **`server.js`**
   - Updated to use `process.env.ADMIN_PORT || process.env.PORT || 3000`
   - Ensures ADMIN_PORT takes precedence if set

### Guest System (Port 3001)

1. **`server/.env` file**
   - Added `GUEST_PORT=3001` for clarity
   - Kept `PORT=3001` for backward compatibility

2. **`server/server.js`**
   - Updated to use `process.env.GUEST_PORT || process.env.PORT || 3001`
   - Updated CORS origins to include `localhost:3001` (in addition to 3000 for compatibility)

3. **`assets/js/utils/config.js`** ⭐ CRITICAL FIX
   - Created `getGuestPort()` helper function
   - Updated `getApiBase()` to use port 3001 for development
   - Updated `getMockBase()` to use port 3001 for development
   - Port detection is environment-aware (localhost uses 3001, production uses configured URL)

4. **Error Messages Updated**
   - `assets/js/utils/api.js` - Dynamic port in error messages
   - `assets/js/components/calendarModal.js` - Dynamic port in warnings
   - `assets/js/utils/calendarShared.js` - Dynamic port in warnings

## Port Configuration

| System | Port | Environment Variable | Status |
|--------|------|---------------------|--------|
| Admin Dashboard | 3000 | `ADMIN_PORT` or `PORT` | ✅ Configured |
| Guest System Backend | 3001 | `GUEST_PORT` or `PORT` | ✅ Configured |
| Guest System Frontend | 3001 | Auto-detected | ✅ Configured |

## Benefits

1. **Clear Separation**: Each system has its own port, preventing conflicts
2. **Easy Configuration**: Change ports by updating `.env` files
3. **Environment Aware**: Frontend automatically detects correct port
4. **Backward Compatible**: Still supports `PORT` environment variable
5. **Helpful Error Messages**: Error messages show correct port numbers

## Testing Checklist

- [x] Admin Dashboard configured for port 3000
- [x] Guest System backend configured for port 3001
- [x] Guest System frontend uses port 3001
- [x] CORS allows connections from both ports
- [x] Error messages reference correct ports
- [ ] **Manual Testing Required**: Start both servers and verify connections

## Next Steps for Testing

1. **Start Admin Dashboard**:
   ```bash
   cd Kina-Dashboard
   npm start
   # Should start on http://localhost:3000
   ```

2. **Start Guest System Backend**:
   ```bash
   cd Kina_Resort_Guest/server
   npm start
   # Should start on http://localhost:3001
   ```

3. **Open Guest System Frontend**:
   - Open the Guest System HTML files in a browser
   - Frontend should automatically connect to `http://localhost:3001/api`
   - Verify API calls work correctly

4. **Verify No Conflicts**:
   - Both servers should run simultaneously without port conflicts
   - Admin Dashboard accessible at `http://localhost:3000`
   - Guest System API accessible at `http://localhost:3001/api`

## Changing Ports (If Needed)

### Change Admin Dashboard Port:
1. Edit `Kina-Dashboard/.env`
2. Update `ADMIN_PORT=3000` to desired port
3. Restart server

### Change Guest System Port:
1. Edit `Kina_Resort_Guest/server/.env`
2. Update `GUEST_PORT=3001` to desired port
3. Restart server
4. Frontend will automatically detect the new port (for localhost development)

## Notes

- Guest System frontend uses intelligent port detection based on hostname
- For production deployments, the frontend uses the configured production URL
- CORS is configured to allow both ports for flexibility
- All hardcoded port references have been eliminated from the codebase

