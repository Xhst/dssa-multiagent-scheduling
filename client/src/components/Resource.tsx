interface ResourceProps {
  id: number;
  size: number;
  onSizeChange: (id: number, newSize: number) => void;
  onRemove: (id: number) => void;
}

const ResourceComp = ({ id, size, onSizeChange, onRemove }: ResourceProps) => {
  const handleSizeChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newSize = Number(event.target.value);
    onSizeChange(id, newSize);
  };

  return (
    <div className="input-group mb-3" id={`resource-${id}`}>
      <span className="input-group-text">Resource {id}</span>
      <input
        type="number"
        className="form-control"
        placeholder="Enter size"
        value={size}
        onChange={handleSizeChange}
        required
      />
      <button
        className="btn btn-danger"
        onClick={() => onRemove(id)}
      >
        Remove
      </button>
    </div>
  );
};

export default ResourceComp;
