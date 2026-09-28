import { registerUser } from "@/services/auth.service";
import { createAllotment } from "@/services/allotment.service";
import { createHousehold } from "@/services/household.service";
import { acceptInvitation, createInvitation } from "@/services/invitation.service";

let counter = 0;

export async function makeUser(name = "User") {
  counter += 1;
  return registerUser({
    name,
    email: `${name.toLowerCase().replace(/\s+/g, "")}${counter}@example.com`,
    password: "password123",
    confirmPassword: "password123",
  });
}

/** A household with an owner, an accepted spouse and two allotments: "Food" and "Household". */
export async function makeHousehold(label = "A") {
  const owner = await makeUser(`Owner${label}`);
  await createHousehold(owner.id, { name: `Household ${label}`, useDefaultAllotments: false });
  const spouse = await makeUser(`Spouse${label}`);
  const { token } = await createInvitation(owner.id);
  await acceptInvitation(spouse.id, token);
  const food = await createAllotment(owner.id, { name: "Food" });
  const household = await createAllotment(owner.id, { name: "Household" });
  return { owner, spouse, food, household };
}
