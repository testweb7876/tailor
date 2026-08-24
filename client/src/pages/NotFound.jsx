import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="grid place-items-center py-20 text-center">
      <div>
        <div className="text-4xl font-semibold text-indigo">404</div>
        <p className="mt-2 text-gray-500">This screen isn’t available yet.</p>
        <Link to="/" className="btn-primary mt-4 inline-flex">Back to dashboard</Link>
      </div>
    </div>
  );
}
