import { TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useWalletStore } from "../stores/wallet-store";

interface Props {
  address: string;
}

// Renders a heart icon that toggles favorite state for a wallet address.
// Reads directly from the global store — no props needed beyond the address.
export function FavoriteButton({ address }: Props) {
  const addFavorite = useWalletStore((s) => s.addFavorite);
  const removeFavorite = useWalletStore((s) => s.removeFavorite);
  const isFavorite = useWalletStore((s) => s.isFavorite);

  const favorited = isFavorite(address);

  return (
    <TouchableOpacity
      onPress={() => {
        if (favorited) {
          removeFavorite(address);
        } else {
          addFavorite(address);
        }
      }}
      style={s.button}
      accessibilityLabel={favorited ? "Remove from watchlist" : "Add to watchlist"}
    >
      <Ionicons
        name={favorited ? "heart" : "heart-outline"}
        size={24}
        color={favorited ? "#FF4545" : "#666"}
      />
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  button: {
    padding: 8,
  },
});
