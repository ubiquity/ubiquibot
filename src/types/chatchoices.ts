export type ChatMessage = {
  content: string;
};

export type Choice = {
  message: ChatMessage;
};

export type Choices = {
  choices: Array<Choice>;
};
