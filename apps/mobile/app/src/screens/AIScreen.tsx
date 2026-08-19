import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, SafeAreaView, TouchableOpacity, TextInput } from "react-native";
import { SafeAreaView as SafeAreaViewNative } from "react-native-safe-area-context";
import { MessageSquare, AlertCircle, Lightbulb, TrendingUp, Sparkles, Send, Mic, X } from "lucide-react-native";
import { mockAIInsights } from "@skysense/utils";
import { StatusBadge } from "@skysense/ui";

export default function AIScreen() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Array<{ id: string; role: "user" | "assistant"; content: string }>>([
    {
      id: "1",
      role: "assistant",
      content: "Hello! I'm your environmental AI assistant. Ask me about air quality, weather, activity recommendations, or anything else!",
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    
    const userMessage = input;
    setInput("");
    setMessages((prev) => [...prev, { id: Date.now().toString(), role: "user", content: userMessage }]);
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "Based on current conditions, I'd recommend outdoor activities before 10 AM when air quality is best.",
        "The UV index is very high today (9). Please apply SPF 50+ sunscreen and limit direct sun exposure between 11 AM - 3 PM.",
        "Air quality has improved to 'Good' over the past 3 days. Great time for your morning run!",
        "Temperature will peak at 35°C today. Stay hydrated and seek shade during peak hours.",
        "Humidity is at 65% - consider using a dehumidifier indoors for comfort.",
      ];
      const response = responses[Math.floor(Math.random() * responses.length)];
      setMessages((prev) => [...prev, { id: (Date.now() + 1).toString(), role: "assistant", content: response }]);
      setIsLoading(false);
    }, 1000);
  };

  return (
    <SafeAreaViewNative style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>AI Assistant</Text>
        <Text style={styles.subtitle}>Your environmental intelligence companion</Text>
      </View>

      {/* Insights Cards */}
      <ScrollView contentContainerStyle={styles.insightsContainer} horizontal showsHorizontalScrollIndicator={false}>
        {mockAIInsights.map((insight) => (
          <View key={insight.id} style={styles.insightCard}>
            <View style={styles.insightHeader}>
              <View style={[styles.insightIcon, { backgroundColor: getInsightColor(insight.type) }]}>
                {getInsightIcon(insight.type)}
              </View>
              <StatusBadge
                status={insight.priority === "high" ? "danger" : insight.priority === "medium" ? "warning" : "info"}
                size="sm"
              >
                {insight.priority}
              </StatusBadge>
            </View>
            <Text style={styles.insightTitle}>{insight.title}</Text>
            <Text style={styles.insightContent}>{insight.content}</Text>
            <Text style={styles.insightTime}>{new Date(insight.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Chat Interface */}
      <View style={styles.chatContainer}>
        <Text style={styles.sectionTitle}>Chat with AI</Text>
        <ScrollView style={styles.chatScroll} contentContainerStyle={styles.chatContent}>
          {messages.map((msg) => (
            <View key={msg.id} style={[styles.messageBubble, msg.role === "user" ? styles.userMessage : styles.aiMessage]}>
              <Text style={[styles.messageText, msg.role === "user" ? styles.userMessageText : styles.aiMessageText]}>
                {msg.content}
              </Text>
            </View>
          ))}
          {isLoading && (
            <View style={styles.typingIndicator}>
              <Text style={styles.typingText}>AI is thinking...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputWrapper}>
            <TouchableOpacity onPress={() => {}} style={styles.inputIcon}>
              <Mic size={20} color="#718096" />
            </TouchableOpacity>
            <TextInput
              style={styles.input}
              value={input}
              onChangeText={setInput}
              placeholder="Ask about weather, air quality, activities..."
              onSubmitEditing={handleSend}
              maxLength={500}
            />
            {input && (
              <TouchableOpacity onPress={() => setInput("")} style={styles.clearButton}>
                <X size={20} color="#718096" />
              </TouchableOpacity>
            )}
          </View>
          <TouchableOpacity onPress={handleSend} disabled={!input.trim() || isLoading} style={styles.sendButton}>
            <Send size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaViewNative>
  );
}

function getInsightColor(type: string) {
  switch (type) {
    case "summary": return "#4299e1";
    case "recommendation": return "#38a169";
    case "alert": return "#e53e3e";
    case "trend": return "#805ad5";
    default: return "#718096";
  }
}

function getInsightIcon(type: string) {
  switch (type) {
    case "summary": return <MessageSquare size={16} color="#ffffff" />;
    case "recommendation": return <Lightbulb size={16} color="#ffffff" />;
    case "alert": return <AlertCircle size={16} color="#ffffff" />;
    case "trend": return <TrendingUp size={16} color="#ffffff" />;
    default: return <Sparkles size={16} color="#ffffff" />;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  header: {
    padding: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#e2e2e7",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#1a1a2e",
  },
  subtitle: {
    fontSize: 14,
    color: "#718096",
    marginTop: 4,
  },
  insightsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  insightCard: {
    width: 280,
    padding: 16,
    backgroundColor: "#f5f5f7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  insightHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  insightIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  insightTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 4,
  },
  insightContent: {
    fontSize: 13,
    color: "#4a5568",
    lineHeight: 18,
    marginBottom: 8,
  },
  insightTime: {
    fontSize: 11,
    color: "#718096",
  },
  chatContainer: {
    flex: 1,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: 12,
  },
  chatScroll: {
    flex: 1,
    maxHeight: 300,
    marginBottom: 16,
  },
  chatContent: {
    gap: 12,
  },
  messageBubble: {
    maxWidth: "85%",
    padding: 12,
    borderRadius: 16,
  },
  userMessage: {
    alignSelf: "flex-end",
    backgroundColor: "#2d3748",
    borderBottomRightRadius: 4,
  },
  aiMessage: {
    alignSelf: "flex-start",
    backgroundColor: "#f5f5f7",
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: "#e2e2e7",
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  userMessageText: {
    color: "#ffffff",
  },
  aiMessageText: {
    color: "#1a1a2e",
  },
  typingIndicator: {
    padding: 12,
    alignSelf: "flex-start",
  },
  typingText: {
    fontSize: 13,
    color: "#718096",
    fontStyle: "italic",
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#e2e2e7",
  },
  inputWrapper: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f7",
    borderRadius: 24,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  inputIcon: {
    padding: 4,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: "#1a1a2e",
  },
  clearButton: {
    padding: 4,
  },
  sendButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#2d3748",
    justifyContent: "center",
    alignItems: "center",
  },
});