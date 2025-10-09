/**
 * 레벨 시스템 유틸리티
 */

/**
 * 레벨별 필요 경험치 계산
 * 공식: level^2 * 100
 * 예: Lv1->2: 100, Lv2->3: 400, Lv3->4: 900, Lv10->11: 10000
 */
export function getRequiredExpForLevel(level: number): number {
  return Math.pow(level, 2) * 100;
}

/**
 * 현재 경험치로 레벨 계산
 * @param exp 현재 경험치
 * @returns { level, currentExp, requiredExp }
 */
export function calculateLevel(exp: number): {
  level: number;
  currentExp: number;
  requiredExp: number;
} {
  let level = 1;
  let totalExp = 0;
  
  while (true) {
    const requiredExp = getRequiredExpForLevel(level);
    if (totalExp + requiredExp > exp) {
      // 현재 레벨에서 필요한 경험치와 현재 진행도
      const currentExp = exp - totalExp;
      return {
        level,
        currentExp,
        requiredExp,
      };
    }
    totalExp += requiredExp;
    level++;
  }
}

/**
 * 레벨업 체크 및 레벨업 횟수 계산
 * @param oldExp 이전 경험치
 * @param newExp 새로운 경험치
 * @returns 레벨업 횟수 (0이면 레벨업 안함)
 */
export function checkLevelUp(oldExp: number, newExp: number): number {
  const oldLevel = calculateLevel(oldExp).level;
  const newLevel = calculateLevel(newExp).level;
  return newLevel - oldLevel;
}

