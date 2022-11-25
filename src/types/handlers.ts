export type ActionHandler = () => Promise<void>;
export type PreActionHandler = ActionHandler;
export type PostActionHandler = ActionHandler;

export type Handler = {
  pre: PreActionHandler[];
  action: ActionHandler[];
  post: PostActionHandler[];
};
