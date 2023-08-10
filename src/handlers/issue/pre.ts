import { findDuplicateOne } from "../../helpers/similarity";

export const checkDuplicates = async (): Promise<void> => {
  await findDuplicateOne();
};
