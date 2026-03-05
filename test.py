import random

def chatbot():
    responses = {
        "hello": ["Hi there!", "Hello!", "Hey!"],
        "how are you": ["I'm doing well, thanks!", "I'm fine, how about you?"],
        "bye": ["Goodbye!", "See you later!"],
        "default": ["I'm not sure what you mean.", "Can you rephrase that?"]
    }
    
    print("Chatbot: Hello! I'm a simple demo chatbot. Type 'bye' to exit.")
    
    while True:
        user_input = input("You: ").lower().strip()
        
        if user_input == "bye":
            print("Chatbot: " + random.choice(responses["bye"]))
            break
        
        found = False
        for key in responses:
            if key in user_input and key != "default":
                print("Chatbot: " + random.choice(responses[key]))
                found = True
                break
        
        if not found:
            print("Chatbot: " + random.choice(responses["default"]))

if __name__ == "__main__":
    chatbot()