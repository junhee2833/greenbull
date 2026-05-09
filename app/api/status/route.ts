import { NextResponse } from 'next/server';
import { getAllRecords } from '@/src/lib/source-tracker';
import { computeServiceStatus } from '@/src/lib/service-status';

// ─── Route Handler ────────────────────────────────────────────────────────────
// 모든 데이터 소스의 최신 상태 레코드를 집계하여 서비스 상태를 반환한다.
// 각 /api/market/* 라우트가 recordSource()를 호출한 결과를 읽어 계산한다.

export async function GET() {
  const records = getAllRecords();
  const status  = computeServiceStatus(records);
  return NextResponse.json(status);
}
