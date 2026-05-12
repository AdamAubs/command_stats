import { Box, Text, useStdout } from "ink";

type Props = { items: Array<[string, number]> };

export default function App({ items }: Props) {
  const { stdout } = useStdout();
  const cols = stdout?.columns || 80;
  const labelW = Math.min(20, Math.max(...items.map((i) => i[0].length), 4));
  const maxCount = items[0]?.[1] || 1;
  const barMax = cols - labelW - 8;

  return (
    <Box flexDirection="column">
      {items.map(([cmd, count]) => {
        const len = Math.round((count / maxCount) * barMax);
        const bar = "█".repeat(Math.max(0, len));
        const label =
          cmd.length > labelW
            ? cmd.slice(0, labelW - 1) + "…"
            : cmd.padEnd(labelW);
        return (
          <Box key={cmd}>
            <Text>{label} </Text>
            <Text color="cyan">{bar}</Text>
            <Text> {count}</Text>
          </Box>
        );
      })}
      {items.length === 0 && <Text>No data for today.</Text>}
    </Box>
  );
}
