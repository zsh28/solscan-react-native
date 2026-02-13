import { useState } from "react"; // React hook for editable form state.
import { View } from "react-native"; // Layout container for grouped UI blocks.
import { Text } from "react-native"; // Text labels and headings.
import { TextInput } from "react-native"; // Numeric token amount fields.
import { TouchableOpacity } from "react-native"; // Pressable controls (swap arrow/button).
import { ScrollView } from "react-native"; // Scroll wrapper for smaller devices.
import { StyleSheet } from "react-native"; // Optimized style definition helper.
import { Alert } from "react-native"; // Native pop-up for validation/confirmation.
import { Ionicons } from "@expo/vector-icons"; // Chevron and arrow icons.

export default function SwapScreen() {
  // Input and output amounts shown in the two token cards.
  const [fromAmount, setFromAmount] = useState("100");
  const [toAmount, setToAmount] = useState("0.28014");

  // Token symbols displayed for the "from" and "to" sides.
  const [fromToken, setFromToken] = useState("USDC");
  const [toToken, setToToken] = useState("SOL");

  // Flips token sides and also swaps visible amount values.
  const swapTokens = () => {
    setFromToken(toToken);
    setToToken(fromToken);
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  // Basic validation + confirmation alert for the demo swap action.
  const handleSwap = () => {
    if (!fromAmount) return Alert.alert("Enter an amount");
    Alert.alert(
      "Swap",
      `Swapping ${fromAmount} ${fromToken} to ${toAmount} ${toToken}`,
    );
  };

  return (
    <ScrollView style={s.scroll} contentContainerStyle={s.content}>
      <Text style={s.title}>Swap Tokens</Text>

      {/* From Token Card */}
      <View style={[s.card, { marginBottom: 10 }]}>
        <View style={s.cardHeader}>
          <TouchableOpacity style={s.tokenSelector}>
            <View style={[s.tokenIcon, { backgroundColor: "#9945FF" }]}>
              <Text style={s.tokenIconText}>S</Text>
            </View>
            <Text style={s.tokenName}>{fromToken}</Text>
            <Ionicons name="chevron-down" size={18} color="#888" />
          </TouchableOpacity>
          <TextInput
            style={s.amountInput}
            value={fromAmount}
            onChangeText={setFromAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#666"
          />
        </View>
        <View style={s.cardFooter}>
          <Text style={s.balanceText}>Balance: 0.0661 {fromToken}</Text>
          <Text style={s.usdText}>$499.749</Text>
        </View>
      </View>

      {/* Swap Arrow */}
      <View style={s.arrowContainer}>
        <TouchableOpacity style={s.swapArrow} onPress={swapTokens}>
          <Ionicons name="arrow-down" size={20} color="#FFF" />
        </TouchableOpacity>
      </View>

      {/* To Token Card */}
      <View style={s.card}>
        <View style={s.cardHeader}>
          <TouchableOpacity style={s.tokenSelector}>
            <View style={[s.tokenIcon, { backgroundColor: "#2775CA" }]}>
              <Text style={s.tokenIconText}>$</Text>
            </View>
            <Text style={s.tokenName}>{toToken}</Text>
            <Ionicons name="chevron-down" size={18} color="#888" />
          </TouchableOpacity>
          <TextInput
            style={s.amountInput}
            value={toAmount}
            onChangeText={setToAmount}
            keyboardType="numeric"
            placeholder="0"
            placeholderTextColor="#666"
          />
        </View>
        <View style={s.cardFooter}>
          <Text style={s.balanceText}>Balance: 250 {toToken}</Text>
          <Text style={s.usdText}>$499.419</Text>
        </View>
      </View>

      {/* Swap Button */}
      <TouchableOpacity style={s.swapBtn} onPress={handleSwap}>
        <Text style={s.swapBtnText}>Swap</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  scroll: {
    flex: 1,
    backgroundColor: "#0D0D12",
  },
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "700",
    marginBottom: 20,
  },
  card: {
    backgroundColor: "#1A1A24",
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: "#2A2A35",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tokenSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#252530",
    paddingLeft: 8,
    paddingRight: 12,
    paddingVertical: 8,
    borderRadius: 24,
    gap: 6,
  },
  tokenIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  tokenIconText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  tokenName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  amountInput: {
    fontSize: 40,
    fontWeight: "400",
    color: "#FFFFFF",
    textAlign: "right",
    flex: 1,
    marginLeft: 10,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
  },
  balanceText: {
    fontSize: 14,
    color: "#666666",
  },
  usdText: {
    fontSize: 14,
    color: "#666666",
  },
  arrowContainer: {
    alignItems: "center",
    marginVertical: -22,
    zIndex: 10,
  },
  swapArrow: {
    backgroundColor: "#0D0D12",
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    borderColor: "#0D0D12",
  },
  swapBtn: {
    backgroundColor: "#14F195",
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
    marginTop: 24,
  },
  swapBtnText: {
    color: "#000000",
    fontSize: 18,
    fontWeight: "600",
  },
});
