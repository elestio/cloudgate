#remove old data series for perf
redis-cli --scan --pattern '/perf/*' | xargs redis-cli del
