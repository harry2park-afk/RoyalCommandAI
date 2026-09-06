import IndependentAIRooms from "../[id]/IndependentAIRooms";
import RCAMultiLayoutEnhancer from "./RCAMultiLayoutEnhancer";

export const metadata = {
  title: "Royal Command AI — Independent Rooms",
};

export default function RCAIndependentRoomsPage() {
  return (
    <>
      <RCAMultiLayoutEnhancer />
      <IndependentAIRooms />
    </>
  );
}
