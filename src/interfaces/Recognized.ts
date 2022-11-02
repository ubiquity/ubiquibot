// export const RecognizedProfits = ["Profit: <10%", "Profit: <50%", "Profit: <100%", "Profit: 100%+"] as const;

// export const RecognizedTimes = ["Time: <1 Day", "Time: <1 Week", "Time: <2 Weeks", "Time: <1 Month", "Time: 1 Month+"] as const;

export const RecognizedProfits = {
  "Profit: <10%": 1,
  "Profit: <50%": 5,
  "Profit: <100%": 10,
  "Profit: 100%+": 20,
};

export const RecognizedTimes = {
  "Time: <1 Day": 1,
  "Time: <1 Week": 2,
  "Time: <2 Weeks": 3,
  "Time: <1 Month": 4,
  "Time: 1 Month+": 5,
};

// export const Recognized = Object.assign(RecognizedProfits, RecognizedTimes);
