export const runtime = "edge";
export const dynamic = "force-dynamic";
import BuilderShell from "../components/BuilderShell";
import { loadData } from "../lib/data";

export default async function Page() {
	const data = await loadData(); // seed only; no API calls here
	return (
		<section>
			<h1 className='mb-3 text-2xl font-semibold'>Autospec Quote Builder</h1>
			<BuilderShell data={data} />
		</section>
	);
}
