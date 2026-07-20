import { C } from "../constants";

export default function SubmitButton({ onClick, isSubmitting, disabled, children }) {
    return (
        <button
            type="button"
            onClick={onClick}
            disabled={disabled || isSubmitting}
            className="text-white text-sm font-semibold px-6 py-1.5 rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all duration-300 enabled:hover:scale-105 enabled:hover:opacity-90 enabled:hover:shadow-md disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ background: C.submitBtn || "#4B75B8" }}
        >
            {isSubmitting ? "Submitting..." : children}
        </button>
    );
}

