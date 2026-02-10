import { Redirect } from "expo-router";

/** Route "/" → /login để tránh screen name rỗng trong Stack. */
export default function IndexScreen() {
  return <Redirect href="/login" />;
}
