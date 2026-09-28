import { currentUser } from "@/server/auth";
import { repository } from "@/server/repository";
import { CoachGate, CoachNav, MemberTable } from "@/components/v2/coach";
export default async function StudentsPage() {
  const user = await currentUser();
  if (user.role !== "coach") return <CoachGate />;
  return (
    <>
      <div className="page-heading">
        <div>
          <p className="eyebrow">TEAM / COACH DEMO</p>
          <h1>一起训练的人。</h1>
          <p>6 位演示成员。真实训练与模拟历史分别标注。</p>
        </div>
      </div>
      <CoachNav current="members" />
      <MemberTable members={repository().team(user.id)} />
    </>
  );
}
