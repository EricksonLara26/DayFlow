import { Search } from "lucide-react";

export default function SearchInput({ value, onChange, placeholder = "Buscar" }) {
  return (
    <label className="search-input">
      <Search size={17} aria-hidden="true" />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
      />
    </label>
  );
}
