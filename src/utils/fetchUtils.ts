export const withRetry = async <T>(
  operation: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> => {
  let lastError: any;
  
  for (let i = 0; i < retries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      if (i === retries - 1) break;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  
  throw lastError;
};