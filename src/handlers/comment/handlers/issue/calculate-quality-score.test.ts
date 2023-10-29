import {
  calculateQualScore,
  estimateOptimalModel,
  countTokensOfConversation,
  gptRelevance,
} from "./calculate-quality-score";
import { Comment, Issue, User, UserType } from "../../../../types/payload";

// Do not run real API calls inside of VSCode because it keeps running the tests in the background
if (process.env.NODE_ENV !== "test") {
  describe("*** Real OpenAI API Call *** calculateQualScore", () => {
    it("should calculate quality score", async () => {
      const issue = { body: "my topic is about apples" } as Issue;
      const comments: Comment[] = [
        { body: "the apple is red", user: { type: UserType.User } as User } as Comment,
        { body: "it is juicy", user: { type: UserType.User } as User } as Comment,
        { body: "bananas are great", user: { type: UserType.User } as User } as Comment,
      ];
      const result = await calculateQualScore(issue, comments);
      expect(result).toBeDefined();
      expect(result.relevanceScores).toBeDefined();
      expect(Array.isArray(result.relevanceScores)).toBe(true);
      expect(typeof result.sumOfConversationTokens).toBe("number");
      expect(typeof result.model).toBe("string");
    });
  });

  describe("*** Real OpenAI API Call *** gptRelevance", () => {
    it("should calculate gpt relevance", async () => {
      const result = await gptRelevance("gpt-3.5-turbo", "my topic is about apples", [
        "the apple is red",
        "it is juicy",
        "bananas are great",
      ]);
      expect(result[0]).toBeGreaterThan(0);
      expect(result[1]).toBeGreaterThan(0);
      expect(result[result.length - 1]).toBe(0);
    });
  });
}

describe("countTokensOfConversation", () => {
  it("should count tokens of conversation", () => {
    const issue = { body: "my topic is about apples" } as Issue;
    const comments: Comment[] = [
      { body: "the apple is red", user: { type: UserType.User } as User } as Comment,
      { body: "it is juicy", user: { type: UserType.User } as User } as Comment,
      { body: "bananas are great", user: { type: UserType.User } as User } as Comment,
    ];
    const result = countTokensOfConversation(issue, comments);
    expect(result).toBeGreaterThan(0);
  });
});

describe("estimateOptimalModel", () => {
  it("should estimate optimal model", () => {
    const result = estimateOptimalModel(5000);
    expect(result).toBe("gpt-3.5-turbo-16k");
  });
});

jest.mock("openai", () => {
  // mock OPEN AI API
  // the purpose of this is to test without real API calls in order to isolate issues
  return jest.fn().mockImplementation(() => {
    return {
      chat: {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [
              {
                message: {
                  content: "[1, 1, 0]",
                },
              },
            ],
          }),
        },
      },
    };
  });
});

describe("calculateQualScore", () => {
  it("should calculate quality score", async () => {
    const issue = { body: "issue body" } as Issue;
    const comment = { body: "comment body", user: { type: "User" } } as Comment;
    const comments = [comment, comment, comment] as Comment[];
    const result = await calculateQualScore(issue, comments);
    expect(result).toBeDefined();
    expect(result.relevanceScores).toBeDefined();
    expect(Array.isArray(result.relevanceScores)).toBe(true);
    expect(typeof result.sumOfConversationTokens).toBe("number");
    expect(typeof result.model).toBe("string");
  });
});

// describe("countTokensOfConversation", () => {
//   it("should count tokens of conversation", () => {
//     const issue = { body: "issue body" } as Issue;
//     const comments = [{ body: "comment body", user: { type: "User" } }] as Comment[];
//     const result = countTokensOfConversation(issue, comments);
//     expect(result).toBeGreaterThan(0);
//   });
// });

describe("gptRelevance", () => {
  it("should calculate gpt relevance", async () => {
    const result = await gptRelevance("gpt-3.5-turbo", "issue body", ["comment body"]);
    expect(result).toEqual([1, 1, 0]);
  });
});
