import { notFound } from "next/navigation";
import { repository, AppError } from "@/server/repository";
import { currentUser } from "@/server/auth";
import { ProblemRoom } from "@/components/v2/problem-room";
export default async function ProblemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await currentUser();
  let problem;
  try {
    problem = repository().problem(id);
  } catch (e) {
    if (e instanceof AppError && e.status === 404) notFound();
    throw e;
  }
  return (
    <ProblemRoom
      key={`${user.id}:${id}`}
      problem={problem}
      userId={user.id}
      canTrain={user.role === "student"}
    />
  );
}
