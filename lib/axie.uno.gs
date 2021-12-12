const AVAILABLE_POOLS = [
    "AXS",
    "AXS-WETH",
    "SLP-WETH"
]

const AVAILABLE_TOKEN = [
    "AXS", "SLP", "WETH", "AXS-WETH", "SLP-WETH", "WRON", "RON"
]

/**
 * Normalizes an address for use in APIs
 */
function normalizeAddress(address) {
    return address?.replace("ronin:", "0x")
}

/**
 * Returns reward infos for a player and a staking pool
 */
function getRewardInfo(player, pool) {
    if (AVAILABLE_POOLS.includes(pool) === false) {
        throw new Error(`Invalid Pool: ${pool} - Valid pools include: ${AVAILABLE_POOLS.join(",")}`);
    }

    const response = UrlFetchApp.fetch(`https://api.axie.uno/userInfo?pool=${pool}&player=${normalizeAddress(player)}`);
    return JSON.parse(response.getContentText());
}

/**
 * Formats seconds into HH:MM:SS format
 */
function formatSeconds(seconds) {
    let sec_num = parseInt(seconds, 10)
    let hours = Math.floor(sec_num / 3600)
    let minutes = Math.floor(sec_num / 60) % 60
    seconds = sec_num % 60

    return [hours, minutes, seconds]
        .map(v => v < 10 ? "0" + v : v)
        .filter((v, i) => v !== "00" || i > 0)
        .join(":")
}

/**
 * Total credited rewards for a player and pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Total credited rewards for a player and pool
 * @customfunction
 */
function getTotalRewardsCredited(player, pool) {
    const rewardInfo = getRewardInfo(player, pool);
    return parseFloat(rewardInfo.totalRewardsCredited)
}

/**
 * Total debited rewards for a player and pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Total debited rewards for a player and pool
 * @customfunction
 */
function getTotalRewardsDebited(player, pool) {
    const rewardInfo = getRewardInfo(player, pool);
    return parseFloat(rewardInfo.totalRewardsDebited)
}

/**
 * Returns seconds since the last claim for a player and a pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @param {boolean} formatted If true return value will be in this format: HH:MM:SS
 * @return Seconds since last claim
 * @customfunction
 */
function getSecondsSinceLastClaim(player, pool, formatted = false) {
    const rewardInfo = getRewardInfo(player, pool);
    return formatted ? formatSeconds(rewardInfo.secondsSinceLastClaim) : rewardInfo.secondsSinceLastClaim
}

/**
 * Returns seconds until the next claim for a player and a pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @param {boolean} formatted If true return value will be in this format: HH:MM:SS
 * @return Seconds until next claim
 * @customfunction
 */
function getSecondsUntilNextClaim(player, pool, formatted = false) {
    const rewardInfo = getRewardInfo(player, pool);
    return formatted ? formatSeconds(rewardInfo.secondsUntilNextClaim) : rewardInfo.secondsUntilNextClaim
}

/**
 * Returns the timestamp for the next claim by a player for a pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Next Claim Date
 * @customfunction
 */
function getNextClaimTimestamp(player, pool) {
    const rewardInfo = getRewardInfo(player, pool);
    return new Date(parseInt(rewardInfo.nextClaimTimestamp) * 1000);
}

/**
 * Returns the timestamp for the latest claim by a player for a pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Last Claim Date
 * @customfunction
 */
function getLastClaimTimestamp(player, pool) {
    const rewardInfo = getRewardInfo(player, pool);
    return new Date(parseInt(rewardInfo.lastClaimTimestamp) * 1000);
}

/**
 * Return and parses current token prices
 */
function getPriceData() {
    const response = UrlFetchApp.fetch(`https://api.axie.uno/prices`);
    const data = JSON.parse(response.getContentText());
    return {AXS: data["axie-infinity"].usd, SLP: data["smooth-love-potion"].usd};
}

/**
 * Load balance for given address and token
 *
 * @param {string} player The players ronin address
 * @param {string} token The token to query. Must be AXS, SLP, WETH, AXS-WETH, SLP-WETH, WRON or RON
 * @return Staking Pools
 * @customfunction
 */
function getBalance(player, token) {
    if (AVAILABLE_TOKEN.includes(token) === false) {
        throw new Error(`Invalid Token: ${token} - Valid token include: ${AVAILABLE_TOKEN.join(",")}`);
    }

    const response = UrlFetchApp.fetch(`https://api.axie.uno/balance?token=${token}&player=${normalizeAddress(player)}`);
    const data = JSON.parse(response.getContentText());
    return data.balance;
}

/**
 * Load all pool data from API
 *
 * @param {string} player The players ronin address
 * @param {boolean} includeAbi If set to true the result will include the staking contract ABI
 * @return Staking Pools
 */
function getPoolData(player, includeAbi = false) {
    const response = UrlFetchApp.fetch(`https://api.axie.uno/pools?includeAbi=${includeAbi}&player=${normalizeAddress(player)}`);
    const data = JSON.parse(response.getContentText());
    return data;
}

/**
 * Get staking pool by Id
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @param {boolean} includeAbi If set to true the result will include the staking contract ABI
 * @return Staking Pool
 */
function getPool(player, pool, includeAbi = false) {
    if (AVAILABLE_POOLS.includes(pool) === false) {
        throw new Error(`Invalid Pool: ${pool} - Valid pools include: ${AVAILABLE_POOLS.join(",")}`);
    }

    const data = getPoolData(player, includeAbi);
    return data.pools[pool];
}

/**
 * Returns the players currently pending rewards for a staking pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Pending rewards
 * @customfunction
 */
function getRewardPending(player, pool) {
    const data = getPool(player, pool);
    return parseFloat(data.reward_pending);
}

/**
 * Returns the players current stake for a staking pool
 *
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Current Stake
 * @customfunction
 */
function getMyStake(player, pool) {
    const data = getPool(player, pool);
    return parseFloat(data.my_stake);
}

/**
 * Returns the total stake in the pool
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Total stake
 * @customfunction
 */
function getTotalStake(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return parseFloat(data.total_stake);
}

/**
 * Returns the total of daily distributed rewards
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Total daily rewards
 * @customfunction
 */
function getRewardPool(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return parseFloat(data.total_daily_rewards);
}

/**
 * Estimates daily rewards for stake and pool
 * @param {number} stake The stake to simulate
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Estimated daily rewards
 * @customfunction
 */
function estimateDailyRewards(stake, pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return parseFloat(stake) / parseFloat(data.total_stake) * parseFloat(data.total_daily_rewards);
}

/**
 * Estimates daily rewards for player and pool
 * @param {string} player The players ronin address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Estimated daily rewards
 * @customfunction
 */
function estimateMyDailyRewards(player, pool) {
    const data = getPool(player, pool);
    return parseFloat(data.estimated_daily_rewards);
}

/**
 * Returns the reward token address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Address
 * @customfunction
 */
function getRewardTokenAddress(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.reward_token.address;
}

/**
 * Returns the reward token name
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Token Name
 * @customfunction
 */
function getRewardTokenName(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.reward_token.name;
}

/**
 * Returns the reward token symbol
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Token Symbol
 * @customfunction
 */
function getRewardTokenSymbol(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.reward_token.symbol;
}

/**
 * Returns the staking token address
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Address
 * @customfunction
 */
function getStakingTokenAddress(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.staking_token.address;
}

/**
 * Returns the staking token name
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Token Name
 * @customfunction
 */
function getStakingTokenName(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.staking_token.name;
}

/**
 * Returns the staking token symbol
 * @param {string} pool The staking pool to check. Must be AXS, AXS-WETH or SLP-WETH
 * @return Token Symbol
 * @customfunction
 */
function getStakingTokenSymbol(pool) {
    const data = getPool("0x0000000000000000000000000000000000000000", pool);
    return data.staking_token.symbol;
}

/**
 * Returns the current AXS / USD price
 * @return USD Price
 * @customfunction
 */
function getAXSPrice() {
    const priceData = getPriceData();
    return priceData.AXS;
}

/**
 * Returns the current SLP / USD price
 * @return USD Price
 * @customfunction
 */
function getSLPPrice() {
    const priceData = getPriceData();
    return priceData.SLP;
}

/**
 * Returns the USD value of given AXS
 * @param {number} stake The stake to calculate
 * @return USD Value
 * @customfunction
 */
function getAXSUSDValue(stake) {
    return stake * getAXSPrice();
}

/**
 * Returns the USD value of given SLP
 * @param {number} stake The stake to calculate
 * @return USD Value
 * @customfunction
 */
function getSLPUSDValue(stake) {
    return stake * getSLPPrice();
}
