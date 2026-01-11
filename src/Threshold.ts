export type Threshold = (errorThreshold: number, volumeThreshold: number, successCount: number, errorCount: number) => boolean;

export const threshold = (errorThreshold: number): Threshold => {
	return errorThreshold < 1 && errorThreshold % 1 ? percentThreshold : integerThreshold;
};

const integerThreshold: Threshold = (errorThreshold, volumeThreshold, successCount, errorCount) => {
	const total = successCount + errorCount;
	return total >= volumeThreshold && errorCount >= errorThreshold;
};

const percentThreshold: Threshold = (errorThreshold, volumeThreshold, successCount, errorCount) => {
	const total = successCount + errorCount;
	return total >= volumeThreshold && errorCount / total >= errorThreshold;
};
