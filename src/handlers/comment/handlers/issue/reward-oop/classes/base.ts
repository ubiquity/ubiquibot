import { User } from "../../../../../../types";
import { View, Role, Contribution } from "./view-role-contribution-enums";

export class DevPoolContributorReward {
  role: Role;
  view: View;
  contribution: Contribution;

  users: User[];
}
