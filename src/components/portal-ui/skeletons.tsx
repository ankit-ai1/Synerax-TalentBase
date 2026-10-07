/** Skeleton loaders shaped like the real portal pages */
const Box = ({ className }: { className: string }) => <div className={`skeleton ${className}`} />;

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`portal-card p-5 sm:p-6 ${className}`}>{children}</div>;
}

export function DashboardSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 lg:gap-6" aria-busy="true" aria-label="Loading">
      <Card className="rounded-[28px]">
        <div className="flex items-center gap-4">
          <Box className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2.5">
            <Box className="h-3.5 w-40" />
            <Box className="h-7 w-72 max-w-full" />
            <Box className="h-3.5 w-96 max-w-full" />
          </div>
        </div>
      </Card>
      <div className="grid grid-cols-2 gap-3 sm:gap-4 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="!p-4 sm:!p-5">
            <Box className="h-3.5 w-24" />
            <Box className="mt-3 h-8 w-16" />
            <Box className="mt-3 h-3 w-32" />
            <Box className="mt-4 h-7 w-full" />
          </Card>
        ))}
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="xl:col-span-8">
          <Box className="h-5 w-40" />
          <div className="mt-5 grid grid-cols-1 gap-3 2xl:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-2xl border border-line p-4">
                <div className="flex gap-3">
                  <Box className="h-11 w-11 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Box className="h-4 w-1/2" />
                    <Box className="h-3 w-2/3" />
                  </div>
                </div>
                <Box className="h-12 w-full" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="xl:col-span-4">
          <Box className="h-5 w-44" />
          <Box className="mt-5 h-14 w-full" />
          <Box className="mt-3 h-20 w-full" />
        </Card>
      </div>
    </div>
  );
}

export function ListSkeleton({ cards = 6 }: { cards?: number }) {
  return (
    <div aria-busy="true" aria-label="Loading">
      <Box className="h-8 w-64 max-w-full" />
      <Box className="mt-2 h-4 w-96 max-w-full" />
      <div className="mt-6 flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Box key={i} className="h-9 w-24 rounded-xl" />
        ))}
      </div>
      <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2 2xl:grid-cols-3">
        {Array.from({ length: cards }).map((_, i) => (
          <Card key={i}>
            <div className="flex gap-3">
              <Box className="h-11 w-11" />
              <div className="flex-1 space-y-2">
                <Box className="h-4 w-3/4" />
                <Box className="h-3 w-1/2" />
              </div>
            </div>
            <Box className="mt-4 h-3 w-2/3" />
            <div className="mt-4 flex gap-1.5">
              <Box className="h-6 w-16" />
              <Box className="h-6 w-20" />
            </div>
            <Box className="mt-5 h-10 w-full" />
          </Card>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="space-y-5" aria-busy="true" aria-label="Loading">
      <Box className="h-4 w-28" />
      <Card className="rounded-[28px]">
        <div className="flex items-center gap-4">
          <Box className="h-16 w-16 rounded-2xl" />
          <div className="flex-1 space-y-2.5">
            <Box className="h-7 w-80 max-w-full" />
            <Box className="h-4 w-48" />
          </div>
          <Box className="hidden h-20 w-20 rounded-full sm:block" />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Box key={i} className="h-10 w-full" />
          ))}
        </div>
      </Card>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Card className="space-y-3 xl:col-span-8">
          <Box className="h-5 w-40" />
          <Box className="h-4 w-full" />
          <Box className="h-4 w-11/12" />
          <Box className="h-4 w-4/5" />
        </Card>
        <Card className="space-y-3 xl:col-span-4">
          <Box className="h-12 w-full" />
          <Box className="h-24 w-full" />
        </Card>
      </div>
    </div>
  );
}
