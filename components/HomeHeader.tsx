import { Container } from "./Container.tsx";
import { site } from "../data/site.ts";

export function HomeHeader() {
  return (
    <header
      class="bg-yellow-200 relative min-h-[30vh]"
    >
      <Container>
      <div class="text-black">
        <h1 class="text-8xl font-bold absolute bottom-14">{site.title}</h1>
        <h2 class="text-xl font-medium absolute bottom-5">{site.description}</h2>
      </div>
      </Container>
    </header>
  );
}
