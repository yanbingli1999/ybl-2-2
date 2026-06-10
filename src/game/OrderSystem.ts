import { Order, MapData, Position, MedicalBoxState, MedicineQuality, WeatherState, VehicleState } from './types';
import {
  MIN_ORDER_REWARD,
  MAX_ORDER_REWARD,
  MIN_ORDER_DISTANCE,
  MAX_ORDER_DISTANCE,
  LOCATION_NAMES,
  GRID_SIZE,
  EMERGENCY_ORDER_CHANCE,
  EMERGENCY_REWARD_MULTIPLIER,
  EMERGENCY_DEADLINE_MULTIPLIER,
  MEDICAL_BOX_TARGET_TEMP,
  MEDICAL_BOX_TEMP_TOLERANCE,
  MEDICAL_BOX_MAX_SHOCK_DAMAGE,
  MEDICAL_BOX_MAX_INTEGRITY,
  TEMP_RISE_RATE_SUNNY,
  TEMP_RISE_RATE_CLOUDY,
  TEMP_RISE_RATE_RAINY,
  TEMP_RISE_RATE_HEAVY_RAIN,
  TEMP_RISE_RATE_STORM,
  SHOCK_DAMAGE_RATE_BASE,
  SHOCK_DAMAGE_RATE_RAIN_MULTIPLIER,
  SHOCK_DAMAGE_RATE_STORM_MULTIPLIER,
  SHOCK_DAMAGE_LOW_DURABILITY_MULTIPLIER,
  INTEGRITY_DECAY_RATE_BASE,
  INTEGRITY_TEMP_PENALTY_MULTIPLIER,
  INTEGRITY_SHOCK_PENALTY_MULTIPLIER,
  QUALITY_EXCELLENT_THRESHOLD,
  QUALITY_GOOD_THRESHOLD,
  QUALITY_ACCEPTABLE_THRESHOLD,
  QUALITY_POOR_THRESHOLD,
  EMERGENCY_LOCATION_NAMES,
} from './constants';


export function createInitialMedicalBox(): MedicalBoxState {
  return {
    temperature: MEDICAL_BOX_TARGET_TEMP,
    targetTemperature: MEDICAL_BOX_TARGET_TEMP,
    temperatureTolerance: MEDICAL_BOX_TEMP_TOLERANCE,
    shockDamage: 0,
    maxShockDamage: MEDICAL_BOX_MAX_SHOCK_DAMAGE,
    integrity: MEDICAL_BOX_MAX_INTEGRITY,
    maxIntegrity: MEDICAL_BOX_MAX_INTEGRITY,
    quality: 'excellent',
  };
}

export function calculateMedicineQuality(integrity: number): MedicineQuality {
  if (integrity >= QUALITY_EXCELLENT_THRESHOLD) return 'excellent';
  if (integrity >= QUALITY_GOOD_THRESHOLD) return 'good';
  if (integrity >= QUALITY_ACCEPTABLE_THRESHOLD) return 'acceptable';
  if (integrity >= QUALITY_POOR_THRESHOLD) return 'poor';
  return 'spoiled';
}

function getTempRiseRate(weatherType: string): number {
  switch (weatherType) {
    case 'sunny': return TEMP_RISE_RATE_SUNNY;
    case 'cloudy': return TEMP_RISE_RATE_CLOUDY;
    case 'rainy': return TEMP_RISE_RATE_RAINY;
    case 'heavy_rain': return TEMP_RISE_RATE_HEAVY_RAIN;
    case 'storm': return TEMP_RISE_RATE_STORM;
    default: return TEMP_RISE_RATE_SUNNY;
  }
}

export function updateMedicalBox(
  box: MedicalBoxState,
  weather: WeatherState,
  vehicle: VehicleState,
  isMoving: boolean,
  deltaTime: number,
  detourFactor: number = 1
): MedicalBoxState {
  let newTemperature = box.temperature;
  let newShockDamage = box.shockDamage;
  let newIntegrity = box.integrity;

  const tempRiseRate = getTempRiseRate(weather.type);
  const tempDiff = Math.abs(newTemperature - box.targetTemperature);

  if (newTemperature < box.targetTemperature + box.temperatureTolerance) {
    newTemperature += tempRiseRate * deltaTime * (weather.intensity / 50 + 0.5);
  }

  if (isMoving) {
    let shockRate = SHOCK_DAMAGE_RATE_BASE;

    if (weather.type === 'rainy' || weather.type === 'heavy_rain') {
      shockRate *= SHOCK_DAMAGE_RATE_RAIN_MULTIPLIER;
    }
    if (weather.type === 'storm') {
      shockRate *= SHOCK_DAMAGE_RATE_STORM_MULTIPLIER;
    }
    if (vehicle.durability < 30) {
      shockRate *= SHOCK_DAMAGE_LOW_DURABILITY_MULTIPLIER;
    }

    newShockDamage += shockRate * deltaTime * detourFactor;
  }

  let integrityDecay = INTEGRITY_DECAY_RATE_BASE * deltaTime;

  const tempExcess = Math.max(0, tempDiff - box.temperatureTolerance);
  if (tempExcess > 0) {
    integrityDecay += tempExcess * INTEGRITY_TEMP_PENALTY_MULTIPLIER * deltaTime;
  }

  const shockRatio = newShockDamage / box.maxShockDamage;
  if (shockRatio > 0.3) {
    integrityDecay += shockRatio * INTEGRITY_SHOCK_PENALTY_MULTIPLIER * deltaTime;
  }

  newIntegrity = Math.max(0, Math.min(box.maxIntegrity, newIntegrity - integrityDecay));

  return {
    ...box,
    temperature: newTemperature,
    shockDamage: Math.min(box.maxShockDamage, newShockDamage),
    integrity: newIntegrity,
    quality: calculateMedicineQuality(newIntegrity),
  };
}

export function generateOrder(
  map: MapData,
  playerPos: Position,
  gameTime: number,
  existingOrders: Order[]
): Order | null {
  const isEmergency = Math.random() < EMERGENCY_ORDER_CHANCE;

  const usedNames = new Set(existingOrders.flatMap((o) => [
    o.pickupLocation.name,
    o.deliveryLocation.name,
  ]));

  const availableNames = isEmergency
    ? EMERGENCY_LOCATION_NAMES.filter((n) => !usedNames.has(n))
    : LOCATION_NAMES.filter((n) => !usedNames.has(n));

  if (availableNames.length < 2) return null;

  const getRandomRoadPosition = (namePool: string[]): Position & { name: string } => {
    const roads = map.roads.filter((r) => r.type === 'intersection');
    const road = roads[Math.floor(Math.random() * roads.length)];
    const name = namePool[Math.floor(Math.random() * namePool.length)];
    return {
      x: road.x + GRID_SIZE / 2,
      y: road.y + GRID_SIZE / 2,
      name,
    };
  };

  const pickupLocation = getRandomRoadPosition(availableNames);
  const deliveryLocation = getRandomRoadPosition(availableNames.filter(n => n !== pickupLocation.name));

  const distance = Math.floor(
    Math.hypot(deliveryLocation.x - pickupLocation.x, deliveryLocation.y - pickupLocation.y) / GRID_SIZE
  );

  const clampedDistance = Math.max(MIN_ORDER_DISTANCE, Math.min(MAX_ORDER_DISTANCE, distance));
  let baseReward = Math.floor(MIN_ORDER_REWARD + (clampedDistance / MAX_ORDER_DISTANCE) * (MAX_ORDER_REWARD - MIN_ORDER_REWARD));

  if (isEmergency) {
    baseReward = Math.floor(baseReward * EMERGENCY_REWARD_MULTIPLIER);
  }

  const reward = baseReward + Math.floor(Math.random() * 20 - 10);

  const estimatedTime = clampedDistance * 1.5;
  let deadline = estimatedTime + 30;

  if (isEmergency) {
    deadline = deadline * EMERGENCY_DEADLINE_MULTIPLIER;
  }

  const customerUrgency = isEmergency
    ? Math.floor(Math.random() * 2) + 4
    : Math.floor(Math.random() * 5) + 1;

  const order: Order = {
    id: `order-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type: isEmergency ? 'emergency' : 'normal',
    pickupLocation,
    deliveryLocation,
    reward: Math.max(MIN_ORDER_REWARD, reward),
    deadline,
    maxDeadline: deadline,
    status: 'available',
    customerUrgency,
    distance: clampedDistance,
    createdAt: gameTime,
  };

  if (isEmergency) {
    order.medicalBox = createInitialMedicalBox();
  }

  return order;
}

export function canAcceptOrder(order: Order, player: { currentOrderId: string | null }): boolean {
  return order.status === 'available' && player.currentOrderId === null;
}

export function isAtLocation(
  playerPos: Position,
  targetPos: Position,
  threshold: number = GRID_SIZE
): boolean {
  const dist = Math.hypot(playerPos.x - targetPos.x, playerPos.y - targetPos.y);
  return dist <= threshold;
}

export function updateOrderDeadlines(orders: Order[], deltaTime: number): Order[] {
  return orders.map((order) => {
    if (order.status === 'accepted' || order.status === 'pickedup' || order.status === 'delivering') {
      const newDeadline = order.deadline - deltaTime;
      if (newDeadline <= 0) {
        return { ...order, deadline: 0, status: 'failed' as const };
      }
      return { ...order, deadline: newDeadline };
    }
    return order;
  });
}

export function getOrderStatusText(status: Order['status']): string {
  const statusMap: Record<Order['status'], string> = {
    available: '可接单',
    accepted: '已接单',
    pickedup: '已取货',
    delivering: '配送中',
    completed: '已完成',
    failed: '已失败',
  };
  return statusMap[status];
}

export function getUrgencyText(urgency: number): string {
  const levels = ['', '不急', '正常', '稍急', '紧急', '非常急'];
  return levels[urgency] || '正常';
}

export function getQualityText(quality: string): string {
  const qualityMap: Record<string, string> = {
    excellent: '优秀',
    good: '良好',
    acceptable: '合格',
    poor: '较差',
    spoiled: '变质失效',
  };
  return qualityMap[quality] || '未知';
}

export function getQualityColor(quality: string): string {
  const colorMap: Record<string, string> = {
    excellent: '#2ed573',
    good: '#7bed9f',
    acceptable: '#ffcc4d',
    poor: '#ff7f50',
    spoiled: '#ff4757',
  };
  return colorMap[quality] || '#ffffff';
}

export function isEmergencyOrder(order: Order): boolean {
  return order.type === 'emergency';
}
