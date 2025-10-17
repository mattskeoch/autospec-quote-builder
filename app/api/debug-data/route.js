export const runtime = 'edge';
import { loadData } from '@/lib/data';

export async function GET() {
  try {
    const data = await loadData();
    // Keep response small if catalog is big:
    const minimal = {
      items: data.items.map(i => ({
        id: i.id,
        name: i.name,
        stepId: i.stepId,
        vehicleTypeKeys: i.vehicleTypeKeys || [],
        variantIdByStore: i.variantIdByStore,
      })),
      vehicles: data.vehicles,
      steps: data.steps.map(s => ({ id: s.id, title: s.title }))
    };
    return new Response(JSON.stringify(minimal, null, 2), {
      headers: { 'content-type': 'application/json' }
    });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500, headers: { 'content-type': 'application/json' }
    });
  }
}
