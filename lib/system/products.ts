import si from 'systeminformation';
import os from 'os';

async function getCpuInfo() {
  const cpu = await si.cpu();
  const load = await si.currentLoad();
  const cores = cpu.cores;
  const perCoreLoad = load.cpus.map(core => core.load); // Load per core
  const avgCoreLoad = perCoreLoad.reduce((acc, val) => acc + val, 0) / cores; // Average load per core
  
  console.log(`CPU Model: ${cpu.manufacturer} ${cpu.model}`);
  console.log(`CPU Cores: ${cores}`);
  console.log(`CPU Average Core Load: ${avgCoreLoad.toFixed(2)}%`);

  return {
    cores,
    avgCoreLoad,
  };
}

async function getMemoryInfo() {
  const mem = await si.mem();
  const totalMemory = mem.total;
  const freeMemory = mem.free;
  const usedMemory = totalMemory - freeMemory;
  const memoryUsedPercentage = (usedMemory / totalMemory) * 100;

  console.log(`Total Memory: ${totalMemory / (1024 * 1024 * 1024)} GB`);
  console.log(`Used Memory: ${usedMemory / (1024 * 1024 * 1024)} GB`);
  console.log(`Free Memory: ${freeMemory / (1024 * 1024 * 1024)} GB`);
  console.log(`Memory Used: ${memoryUsedPercentage.toFixed(2)}%`);

  return {
    totalMemory,
    freeMemory,
    memoryUsedPercentage,
  };
}

async function getBatteryStatus() {
  const battery = await si.battery();
  const isCharging = battery.isCharging;
  const chargePercentage = battery.percent;

  console.log(`Battery Charging: ${isCharging ? 'Yes' : 'No'}`);
  console.log(`Battery Percentage: ${chargePercentage}%`);

  return {
    isCharging,
    chargePercentage,
  };
}

// Function to estimate the maximum number of tabs based on system info
export async function recommendPageCount(): Promise<number> {
  const { cores, avgCoreLoad } = await getCpuInfo();
  const { freeMemory, memoryUsedPercentage } = await getMemoryInfo();
  const { isCharging } = await getBatteryStatus();

  // Define an average memory usage per tab (approximate, this can vary depending on the content)
  const memoryPerTab = 500 * 1024 * 1024; // 500 MB per tab in bytes

  // Available free memory for tabs
  const availableMemoryForTabs = freeMemory;

  // Estimate the number of tabs based on available free memory
  const maxTabs = Math.floor(availableMemoryForTabs / memoryPerTab);

  // Adjust based on CPU load and cores
  const loadFactor = 1 - avgCoreLoad / 100; // Scale between 0 (max load) and 1 (idle)
  const coreFactor = cores / 8; // Scale based on cores (e.g., 8 cores would be 1x multiplier)

  // Adjust based on whether the laptop is charging (better performance when charging)
  const chargingFactor = isCharging ? 1.2 : 1;

  // Calculate recommended number of tabs
  let recommendedTabs = Math.floor(maxTabs * loadFactor * coreFactor * chargingFactor);

  // Cap the number of tabs to avoid overloading the system (e.g., 20 tabs)
  recommendedTabs = Math.round(Math.min(recommendedTabs, 10));

  console.log(`Recommended number of tabs: ${recommendedTabs}`);

  return recommendedTabs;
}

// Run the recommendation function
recommendPageCount();
