export type User = {
  readonly id: string;
  readonly email: string;
  readonly name: string;
  readonly profilePic?: string;
  readonly status: 'actively_looking' | 'browsing' | 'found_roommate';
  readonly preferences: UserPreferences;
};

export type UserPreferences = {
  readonly sleepSchedule: 'early_bird' | 'night_owl' | 'flexible';
  readonly noiseLevel: number;
  readonly cleanlinessLevel: number;
  readonly hasPets: boolean;
  readonly preferredLocations: string[];
};

export type Post = {
  readonly id: string;
  readonly authorId: string;
  readonly authorName: string;
  readonly location: string;
  readonly budget: number;
  readonly moveInDate: string;
  readonly roomType: 'single' | 'double' | 'suite';
  readonly noiseLevel: number;
  readonly cleanlinessLevel: number;
  readonly description: string;
  readonly createdAt: string;
  matchScore?: number;
};

export type LoginRequest = {
  readonly email: string;
  readonly password: string;
};

export type LoginResponse = {
  readonly token: string;
  readonly user: User;
};