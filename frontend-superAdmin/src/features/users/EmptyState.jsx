const EmptyState = ({ colSpan, message }) => {
  return (
    <tr>
      <td colSpan={colSpan} className="text-center py-4">
        {message}
      </td>
    </tr>
  );
};

export default EmptyState;