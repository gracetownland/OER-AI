import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { IH5PQuestion } from "@/types/MaterialEditor";
import { Separator } from "../ui/separator";

interface MCQEditableProps {
  question: IH5PQuestion;
  questionNumber: number;
  onUpdate: (updatedQuestion: IH5PQuestion) => void;
}

export function MCQEditable({
  question,
  questionNumber,
  onUpdate,
}: MCQEditableProps) {
  const [isEditingQuestion, setIsEditingQuestion] = useState(false);
  const [editingAnswerIndex, setEditingAnswerIndex] = useState<number | null>(
    null
  );

  const handleQuestionChange = (newText: string) => {
    onUpdate({
      ...question,
      params: {
        ...question.params,
        question: newText,
      },
    });
  };

  const handleAnswerTextChange = (index: number, newText: string) => {
    const newAnswers = [...question.params.answers];
    newAnswers[index] = {
      ...newAnswers[index],
      text: newText,
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        answers: newAnswers,
      },
    });
  };

  const handleFeedbackChange = (
    index: number,
    field: "tip" | "chosenFeedback" | "notChosenFeedback",
    value: string
  ) => {
    const newAnswers = [...question.params.answers];
    newAnswers[index] = {
      ...newAnswers[index],
      tipsAndFeedback: {
        ...newAnswers[index].tipsAndFeedback,
        [field]: value,
      },
    };
    onUpdate({
      ...question,
      params: {
        ...question.params,
        answers: newAnswers,
      },
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold mb-2">
          Question {questionNumber}
        </CardTitle>
        {isEditingQuestion ? (
          <Textarea
            value={question.params.question}
            onChange={(e) => handleQuestionChange(e.target.value)}
            onBlur={() => setIsEditingQuestion(false)}
            autoFocus
            className="text-sm"
          />
        ) : (
          <div
            onClick={() => setIsEditingQuestion(true)}
            className="text-muted-foreground text-sm cursor-pointer hover:bg-muted rounded"
          >
            {question.params.question}
          </div>
        )}
      </CardHeader>

      <CardContent>
        {/* Answer Options */}
        {question.params.answers.map((answer, index) => (
          <div key={index} className="flex flex-col items-start gap-2">
              <div className="flex-1 w-full">
                {editingAnswerIndex === index ? (
                  <Input
                    value={answer.text}
                    onChange={(e) =>
                      handleAnswerTextChange(index, e.target.value)
                    }
                    onBlur={() => setEditingAnswerIndex(null)}
                    autoFocus
                    className="text-sm"
                  />
                ) : (
                  <div
                    onClick={() => setEditingAnswerIndex(index)}
                    className="text-sm p-2 cursor-pointer hover:bg-muted rounded border"
                  >
                    {answer.text}
                  </div>
                )}

                {/* Feedback fields */}
                <div className="mt-2 space-y-2 pl-2 border-l-2 border-muted">
                  <div>
                    <label className="text-xs text-muted-foreground">
                      Tip (optional)
                    </label>
                    <Input
                      value={answer.tipsAndFeedback?.tip || ""}
                      onChange={(e) =>
                        handleFeedbackChange(index, "tip", e.target.value)
                      }
                      placeholder="Hint for this answer"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      Chosen Feedback (optional)
                    </label>
                    <Input
                      value={answer.tipsAndFeedback?.chosenFeedback || ""}
                      onChange={(e) =>
                        handleFeedbackChange(
                          index,
                          "chosenFeedback",
                          e.target.value
                        )
                      }
                      placeholder="Feedback when selected"
                      className="text-xs mt-1"
                    />
                  </div>

                  <div>
                    <label className="text-xs text-muted-foreground">
                      Not Chosen Feedback (optional)
                    </label>
                    <Input
                      value={answer.tipsAndFeedback?.notChosenFeedback || ""}
                      onChange={(e) =>
                        handleFeedbackChange(
                          index,
                          "notChosenFeedback",
                          e.target.value
                        )
                      }
                      placeholder="Feedback when not selected"
                      className="text-xs mt-1"
                    />
                  </div>
                </div>
                <Separator className="my-4" />
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
