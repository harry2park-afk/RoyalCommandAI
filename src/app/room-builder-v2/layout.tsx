export default function RoomBuilderV2Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="fixed inset-0 overflow-y-auto overscroll-y-contain">
      {children}
    </div>
  );
}
