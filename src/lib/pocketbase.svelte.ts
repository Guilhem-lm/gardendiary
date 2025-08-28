import PocketBase from "pocketbase";

export const pb = new PocketBase("https://api.gardendiary.app");

let currentUser = $state(pb.authStore.record);

export function getCurrentUser() {
  return currentUser;
}

pb.authStore.onChange((auth) => {
  console.log("authStore changed", auth);
  currentUser = pb.authStore.record;
});
