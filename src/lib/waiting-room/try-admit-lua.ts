export const TRY_ADMIT_LUA = `
local activeKey = KEYS[1]
local queueKey = KEYS[2]
local heartbeatsKey = KEYS[3]
local ticketSeqKey = KEYS[4]
local capacity = tonumber(ARGV[1])
local userId = ARGV[2]
local nowMs = tonumber(ARGV[3])
local sessionTtlMs = tonumber(ARGV[4])
local queueTtlMs = tonumber(ARGV[5])

redis.call('ZREMRANGEBYSCORE', activeKey, '-inf', tostring(nowMs))

local existingExpiry = redis.call('ZSCORE', activeKey, userId)
if existingExpiry and tonumber(existingExpiry) > nowMs then
  return {3, -1}
end

local ticket = redis.call('ZSCORE', queueKey, userId)
if not ticket then
  ticket = redis.call('INCR', ticketSeqKey)
  redis.call('ZADD', queueKey, tostring(ticket), userId)
end
redis.call('ZADD', heartbeatsKey, tostring(nowMs), userId)

local staleThreshold = nowMs - queueTtlMs
while true do
  local front = redis.call('ZRANGE', queueKey, 0, 0)
  if not front[1] then break end
  local lastSeen = redis.call('ZSCORE', heartbeatsKey, front[1])
  if lastSeen and tonumber(lastSeen) > staleThreshold then break end
  redis.call('ZREM', queueKey, front[1])
  redis.call('ZREM', heartbeatsKey, front[1])
end

local activeCount = redis.call('ZCARD', activeKey)
if activeCount < capacity then
  local front = redis.call('ZRANGE', queueKey, 0, 0)
  if front[1] and front[1] == userId then
    redis.call('ZADD', activeKey, tostring(nowMs + sessionTtlMs), userId)
    redis.call('ZREM', queueKey, userId)
    redis.call('ZREM', heartbeatsKey, userId)
    return {1, -1}
  end
end

local position = redis.call('ZRANK', queueKey, userId)
if position == false then return {2, 1} end
return {2, position + 1}
`;
