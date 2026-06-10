export interface Position {
  x: number;
  y: number;
}

export interface PlayerState {
  id: string;
  name: string;
  money: number;
  stamina: number;
  maxStamina: number;
  position: Position;
  currentOrderId: string | null;
  completedOrders: number;
  totalRating: number;
}

export interface VehicleState {
  id: string;
  battery: number;
  maxBattery: number;
  durability: number;
  maxDurability: number;
  speed: number;
  baseSpeed: number;
  position: Position;
  direction: 'up' | 'down' | 'left' | 'right';
}

export type OrderStatus = 'available' | 'accepted' | 'pickedup' | 'delivering' | 'completed' | 'failed';

export type OrderType = 'normal' | 'emergency';

export type MedicineQuality = 'excellent' | 'good' | 'acceptable' | 'poor' | 'spoiled';

export interface MedicalBoxState {
  temperature: number;
  targetTemperature: number;
  temperatureTolerance: number;
  shockDamage: number;
  maxShockDamage: number;
  integrity: number;
  maxIntegrity: number;
  quality: MedicineQuality;
}

export interface Order {
  id: string;
  type: OrderType;
  pickupLocation: Position & { name: string };
  deliveryLocation: Position & { name: string };
  reward: number;
  deadline: number;
  maxDeadline: number;
  status: OrderStatus;
  customerUrgency: number;
  distance: number;
  createdAt: number;
  medicalBox?: MedicalBoxState;
}

export type WeatherType = 'sunny' | 'cloudy' | 'rainy' | 'heavy_rain' | 'storm';

export interface WeatherState {
  type: WeatherType;
  intensity: number;
  speedModifier: number;
  nextChangeTime: number;
}

export interface Road {
  id: string;
  type: 'horizontal' | 'vertical' | 'intersection';
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Building {
  id: string;
  name: string;
  type: 'residential' | 'commercial' | 'industrial';
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
}

export interface LocationPoint {
  id: string;
  name: string;
  type: 'charging' | 'repair' | 'pickup' | 'delivery';
  x: number;
  y: number;
}

export interface MapData {
  width: number;
  height: number;
  gridSize: number;
  roads: Road[];
  buildings: Building[];
  chargingStations: LocationPoint[];
  repairShops: LocationPoint[];
}

export interface IncomeRecord {
  id: string;
  orderId: string;
  orderType: OrderType;
  baseReward: number;
  latePenalty: number;
  bonus: number;
  qualityPenalty: number;
  qualityBonus: number;
  finalAmount: number;
  rating: number;
  medicineQuality?: MedicineQuality;
  completedAt: number;
  details: string;
}

export interface GameState {
  player: PlayerState;
  vehicle: VehicleState;
  weather: WeatherState;
  orders: Order[];
  incomeRecords: IncomeRecord[];
  map: MapData;
  gameTime: number;
  isPaused: boolean;
  isGameOver: boolean;
  showSettlement: boolean;
  lastSettlement: IncomeRecord | null;
  plannedPath: Position[];
  isCharging: boolean;
  isRepairing: boolean;
  isResting: boolean;
}

export interface GameSave {
  version: string;
  savedAt: number;
  player: PlayerState;
  vehicle: VehicleState;
  weather: WeatherState;
  orders: Order[];
  incomeRecords: IncomeRecord[];
  gameTime: number;
  map: MapData;
}

export type GameAction =
  | { type: 'MOVE'; direction: 'up' | 'down' | 'left' | 'right' }
  | { type: 'ACCEPT_ORDER'; orderId: string }
  | { type: 'PICKUP_ORDER'; orderId: string }
  | { type: 'DELIVER_ORDER'; orderId: string }
  | { type: 'START_CHARGING' }
  | { type: 'STOP_CHARGING' }
  | { type: 'START_REPAIRING' }
  | { type: 'STOP_REPAIRING' }
  | { type: 'START_RESTING' }
  | { type: 'STOP_RESTING' }
  | { type: 'GENERATE_ORDERS' }
  | { type: 'TICK'; deltaTime: number }
  | { type: 'TOGGLE_PAUSE' }
  | { type: 'CLOSE_SETTLEMENT' }
  | { type: 'PLAN_PATH'; path: Position[] }
  | { type: 'CLEAR_PATH' }
  | { type: 'NEW_GAME' }
  | { type: 'LOAD_GAME'; save: GameSave }
  | { type: 'GAME_OVER' };
