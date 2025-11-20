import torch
import torch.nn.functional as F
from models.crnn_model import BLANK_IDX, idx_to_char


def ctc_greedy_decode(logits):
    """
    Greedy CTC decoder - takes the most probable character at each timestep
    and collapses repeated characters

    Args:
        logits: Tensor of shape (T, B, C) where:
                T = sequence length
                B = batch size
                C = number of classes (including blank)

    Returns:
        List of decoded strings (length B)
    """
    # Convert logits to log probabilities
    log_probs = F.log_softmax(logits, dim=2)

    # Get the most probable class at each timestep
    max_indices = log_probs.argmax(dim=2)  # (T, B)

    T, B = max_indices.shape
    results = []

    for b in range(B):
        prev = BLANK_IDX
        chars = []

        for t in range(T):
            idx = int(max_indices[t, b])

            # CTC rules:
            # 1. Skip blank tokens
            # 2. Skip repeated characters (collapse duplicates)
            if idx != BLANK_IDX and idx != prev:
                chars.append(idx_to_char.get(idx, "?"))

            prev = idx

        results.append("".join(chars))

    return results


def ctc_beam_search_decode(logits, beam_width=5):
    """
    Beam search CTC decoder - explores multiple hypotheses
    (More accurate but slower than greedy decode)

    Args:
        logits: Tensor of shape (T, B, C)
        beam_width: Number of beams to keep

    Returns:
        List of decoded strings (length B)
    """
    # Convert logits to log probabilities
    log_probs = F.log_softmax(logits, dim=2)  # (T, B, C)

    T, B, C = log_probs.shape
    results = []

    for b in range(B):
        # Initialize beam with empty sequence
        beams = [("", 0.0)]  # (sequence, log_prob)

        for t in range(T):
            new_beams = {}

            for seq, score in beams:
                for c in range(C):
                    char_score = log_probs[t, b, c].item()

                    if c == BLANK_IDX:
                        # Blank - don't add character
                        new_seq = seq
                    else:
                        # Non-blank character
                        char = idx_to_char.get(c, "?")

                        # Don't add if it's the same as the last character
                        if len(seq) > 0 and seq[-1] == char:
                            new_seq = seq
                        else:
                            new_seq = seq + char

                    new_score = score + char_score

                    # Keep best score for each unique sequence
                    if new_seq not in new_beams or new_beams[new_seq] < new_score:
                        new_beams[new_seq] = new_score

            # Keep top beam_width sequences
            beams = sorted(new_beams.items(), key=lambda x: x[1], reverse=True)[:beam_width]

        # Return best sequence
        if beams:
            results.append(beams[0][0])
        else:
            results.append("")

    return results


def calculate_sequence_confidence(logits):
    """
    Calculate confidence score for the decoded sequence

    Args:
        logits: Tensor of shape (T, B, C)

    Returns:
        Float confidence score between 0 and 1
    """
    # Get probabilities
    probs = F.softmax(logits, dim=2)  # (T, B, C)

    # Get max probability at each timestep
    max_probs, _ = torch.max(probs, dim=2)  # (T, B)

    # Average confidence across all timesteps and batch
    confidence = torch.mean(max_probs).item()

    return confidence